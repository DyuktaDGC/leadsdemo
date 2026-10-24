// Demo backend: the whole app runs in this browser. Data lives in localStorage.
type Role = 'owner' | 'employee'

type UserRow = { id: string; email: string; fullName: string; role: Role; active: boolean }
type ProjectRow = { id: string; name: string; active: boolean; memberIds: string[] }
type LeadRow = {
  id: string
  date: string
  name: string
  phone: string | null
  source: string | null
  sourceName: string | null
  project: string | null
  possession: string | null
  status: string
  priority: string | null
  nextFollowUpAt: string | null
  assigneeIds: string[]
  lostReason: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  touchedAt: string
  campaign: string | null
  amount: number | null
}
type EventRow = {
  leadId: string
  at: string
  event: string
  field: string | null
  from: string | null
  to: string | null
  byName: string | null
  reason: string | null
  assigneeIds: string[]
}
type CampaignRow = { id: string; name: string; platform: string; sourceId: string; stopped: boolean; start: string; leads: number }
type Db = { users: UserRow[]; projects: ProjectRow[]; leads: LeadRow[]; events: EventRow[]; campaigns: CampaignRow[] }
type Me = { id: string; name: string; role: Role }

const DB_KEY = 'leaddgc.demo.db.v2'
const USER_KEY = 'leaddgc.demo.user'
const DAY = 86400000

const STATUSES = ['new', 'call_after_some_time', 'call_back_later', 'interested', 'invalid_number', 'lost', 'not_answered', 'not_interested', 'not_reachable', 'reg_done', 'sent_details', 'switched_off', 'closed']
const EDITABLE = ['name', 'source', 'sourceName', 'project', 'possession', 'status', 'priority', 'nextFollowUpAt', 'notes', 'lostReason', 'amount'] as const

const isTerminal = (status: string) => status === 'closed' || status === 'lost'
const same = (a: unknown, b: unknown) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const clean = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const asText = (value: unknown) => (value === null || value === undefined ? null : String(value))
const nowIso = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

let db: Db = load()
let currentUserId: string | null = storage()?.getItem(USER_KEY) ?? null

function load(): Db {
  try {
    const saved = storage()?.getItem(DB_KEY)
    if (saved) return JSON.parse(saved) as Db
  } catch {}
  return seed()
}

function persist() {
  try {
    storage()?.setItem(DB_KEY, JSON.stringify(db))
  } catch {}
}

export function demoUsers() {
  return db.users.filter((u) => u.active).map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role }))
}

export function setCurrentUser(id: string | null) {
  currentUserId = id
  try {
    if (id) storage()?.setItem(USER_KEY, id)
    else storage()?.removeItem(USER_KEY)
  } catch {}
}

export function resetDemo() {
  db = seed()
  persist()
  setCurrentUser(null)
}

function viewer(): Me {
  const user = db.users.find((u) => u.id === currentUserId && u.active)
  if (!user) throw new Error('Your session has expired. Sign in again.')
  return { id: user.id, name: user.fullName, role: user.role }
}

function requireOwner() {
  const me = viewer()
  if (me.role !== 'owner') throw new Error('Only the owner can do that.')
  return me
}

function canSee(row: LeadRow, me: Me, myProjects: string[]) {
  if (me.role === 'owner') return true
  if (row.assigneeIds.includes(me.id)) return true
  if (row.assigneeIds.length > 0) return false
  return !row.project || myProjects.some((name) => same(name, row.project))
}

function toLead(row: LeadRow, events: EventRow[], me: Me, names: Record<string, string>, now: number) {
  const mine = row.assigneeIds.includes(me.id)
  const owner = me.role === 'owner'
  const terminal = isTerminal(row.status)
  const view = mine ? 'mine' : row.assigneeIds.length === 0 ? 'unassigned' : 'others'
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source,
    sourceName: row.sourceName,
    campaign: row.campaign,
    project: row.project,
    possession: row.possession,
    status: row.status,
    isTerminal: terminal,
    view,
    canEdit: owner || mine,
    canAssign: !terminal && (owner || mine || view === 'unassigned'),
    priority: row.priority,
    nextFollowUpAt: row.nextFollowUpAt,
    assignees: row.assigneeIds.map((id) => ({ id, name: names[id] || 'Former user' })),
    lostReason: row.lostReason,
    notes: row.notes,
    amount: Number(row.amount) || null,
    untouchedDays: terminal ? null : Math.max(0, Math.floor((now - Date.parse(row.touchedAt || row.createdAt)) / DAY)),
    history: events
      .filter((event) => event.event === 'assigned')
      .map((event) => ({ at: event.at, assigneeId: event.assigneeIds[0] || null, assigneeName: event.to, byName: event.byName, reason: event.reason })),
    activity: events
      .map((event) => ({ at: event.at, event: event.event, field: event.field, from: event.from, to: event.to, byName: event.byName, reason: event.reason }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at))),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

function normalize(field: string, value: unknown) {
  if (field === 'status') {
    if (!STATUSES.includes(String(value))) throw new Error('Pick a valid status.')
    return value
  }
  if (field === 'priority') {
    if (!['high', 'medium', 'low'].includes(String(value))) throw new Error('Pick a valid priority.')
    return value
  }
  if (field === 'nextFollowUpAt') {
    if (value === null || value === '') return null
    if (typeof value !== 'string' || isNaN(Date.parse(value))) throw new Error('The follow up date is not valid.')
    return new Date(value).toISOString()
  }
  if (field === 'amount') {
    if (value === null || value === '') return null
    const amount = Number(String(value).replace(/[,\s₹]/g, ''))
    if (!(amount > 0)) throw new Error('Enter a valid deal amount.')
    return amount
  }
  if (field === 'name') {
    const name = clean(value)
    if (!name) throw new Error('The lead needs a name.')
    return name
  }
  return clean(value)
}

function updateLead(lead: LeadRow, changes: Record<string, unknown>, reason: string | null, me: Me, events: EventRow[]) {
  if (me.role !== 'owner' && !lead.assigneeIds.includes(me.id)) throw new Error('Only the people handling this lead can change it.')
  const patch: Record<string, unknown> = {}
  const now = nowIso()
  for (const field of EDITABLE) {
    if (!(field in changes)) continue
    const value = normalize(field, changes[field])
    if (asText(lead[field]) === asText(value)) continue
    patch[field] = value
    events.push({ leadId: lead.id, at: now, event: 'updated', field, from: asText(lead[field]), to: asText(value), byName: me.name, reason, assigneeIds: [] })
  }
  const nextStatus = (patch.status as string) || lead.status
  const nextLost = 'lostReason' in patch ? patch.lostReason : lead.lostReason
  if (nextStatus === 'lost' && !nextLost) throw new Error('Say why the lead was lost.')
  if (nextStatus === 'closed' && !('amount' in patch ? patch.amount : lead.amount)) throw new Error('Enter the deal amount for a closed lead.')
  if (!events.length) return { noop: true }
  Object.assign(lead, patch, { updatedAt: now, touchedAt: now })
  return {}
}

function assignLeads(leads: LeadRow[], toUserIds: string[], reason: string | null, me: Me, events: EventRow[]) {
  const active: Record<string, UserRow> = {}
  db.users.filter((user) => user.active).forEach((user) => (active[user.id] = user))
  const targets = [...new Set(toUserIds)]
  if (!targets.length) throw new Error('Pick at least one person to handle this lead.')
  if (targets.some((id) => !active[id])) throw new Error('One of those people no longer has access.')
  const results: { leadId: string; ok: boolean; noop?: boolean; error?: string }[] = []
  const now = nowIso()
  for (const lead of leads) {
    const mine = lead.assigneeIds.includes(me.id)
    if (me.role !== 'owner' && !mine && lead.assigneeIds.length > 0) {
      results.push({ leadId: lead.id, ok: false, error: 'Someone else is handling this lead.' })
      continue
    }
    if (isTerminal(lead.status)) {
      results.push({ leadId: lead.id, ok: false, error: 'Closed leads cannot be reassigned.' })
      continue
    }
    if (targets.length === lead.assigneeIds.length && targets.every((id) => lead.assigneeIds.includes(id))) {
      results.push({ leadId: lead.id, ok: true, noop: true })
      continue
    }
    Object.assign(lead, { assigneeIds: targets, updatedAt: now, touchedAt: now })
    events.push({ leadId: lead.id, at: now, event: 'assigned', field: null, from: null, to: targets.map((id) => active[id].fullName).join(', '), byName: me.name, reason, assigneeIds: targets })
    results.push({ leadId: lead.id, ok: true })
  }
  if (leads.length === 1 && results[0] && !results[0].ok) throw new Error(results[0].error)
  return { noop: results.every((r) => !r.ok || r.noop), results }
}

type ProjectInput = { action: string; projectId?: string; name?: string; active?: boolean; userIds?: string[] }
type LeadInput = { action: string; leadId?: string; leadIds?: string[]; reason?: string; toUserIds?: string[]; changes?: Record<string, unknown> }

const API = {
  currentSession() {
    const user = db.users.find((u) => u.id === currentUserId && u.active)
    return user ? { userId: user.id, email: user.email, fullName: user.fullName, role: user.role } : null
  },

  performance() {
    const me = viewer()
    const closedAt: Record<string, string> = {}
    db.events.forEach((event) => event.field === 'status' && event.to === 'closed' && (closedAt[event.leadId] = event.at))
    const totals: Record<string, number> = {}
    const mine: { leadId: string; name: string; closedAt: string; amount: number }[] = []
    db.leads.forEach((lead) => {
      if (lead.status !== 'closed' || !lead.assigneeIds.length) return
      const share = (Number(lead.amount) || 0) / lead.assigneeIds.length
      lead.assigneeIds.forEach((id) => (totals[id] = (totals[id] || 0) + share))
      if (lead.assigneeIds.includes(me.id)) mine.push({ leadId: lead.id, name: lead.name, closedAt: closedAt[lead.id] || lead.updatedAt, amount: share })
    })
    const board = db.users
      .filter((user) => user.active)
      .map((user) => ({ name: user.fullName, amount: totals[user.id] || 0, you: user.id === me.id }))
      .sort((a, b) => b.amount - a.amount)
    return { mine, board }
  },

  listLeads(query: { month?: string; from?: string; to?: string } = {}) {
    const me = viewer()
    const names: Record<string, string> = {}
    db.users.forEach((user) => (names[user.id] = user.fullName))
    const active = db.projects.filter((p) => p.active)
    const myProjects = active.filter((p) => p.memberIds.includes(me.id)).map((p) => p.name)
    const visible = db.leads
      .filter((row) => canSee(row, me, myProjects))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    const inRange = visible.filter((row) => {
      if (query.month) return row.date.startsWith(query.month)
      if (query.from && row.date < query.from) return false
      if (query.to && row.date > query.to) return false
      return true
    })
    const byLead: Record<string, EventRow[]> = {}
    db.events.forEach((event) => (byLead[event.leadId] = byLead[event.leadId] || []).push(event))
    const now = Date.now()
    return {
      leads: inRange.map((row) => toLead(row, byLead[row.id] || [], me, names, now)),
      months: [...new Set(visible.map((row) => row.date.slice(0, 7)))].sort().reverse(),
      roster: db.users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName, role: u.role, projects: active.filter((p) => p.memberIds.includes(u.id)).length }))
    }
  },

  writeLead(input: LeadInput) {
    const me = viewer()
    const reason = clean(input.reason)
    const ids = new Set([...(input.leadIds || []), ...(input.leadId ? [input.leadId] : [])])
    if (!ids.size) throw new Error('Pick a lead first.')
    const leads = db.leads.filter((row) => ids.has(row.id))
    if (!leads.length) throw new Error('That lead no longer exists.')
    const events: EventRow[] = []
    let response
    if (input.action === 'update') response = updateLead(leads[0], input.changes || {}, reason, me, events)
    else if (input.action === 'assign') response = assignLeads(leads, input.toUserIds || [], reason, me, events)
    else throw new Error('Unknown action.')
    db.events.push(...events)
    return response
  },

  listProjects() {
    viewer()
    const names: Record<string, string> = {}
    db.users.forEach((user) => (names[user.id] = user.fullName))
    return db.projects.map((p) => ({ ...p, memberNames: p.memberIds.map((id) => names[id] || 'Former user') }))
  },

  writeProject(input: ProjectInput) {
    requireOwner()
    if (input.action === 'addProject') {
      const name = clean(input.name)
      if (!name) throw new Error('Name the project.')
      if (db.projects.some((p) => same(p.name, name))) throw new Error('A project with that name already exists.')
      const id = uuid()
      db.projects.push({ id, name, active: true, memberIds: [] })
      return { projectId: id }
    }
    const project = db.projects.find((p) => p.id === input.projectId)
    if (!project) throw new Error('That project no longer exists.')
    if (input.action === 'deleteProject') {
      db.projects = db.projects.filter((p) => p.id !== project.id)
      return { projectId: project.id }
    }
    if (input.action === 'setMembers') project.memberIds = [...new Set(input.userIds || [])]
    else {
      const name = input.name === undefined ? project.name : clean(input.name)
      if (!name) throw new Error('Name the project.')
      if (name !== project.name) db.leads.forEach((lead) => same(lead.project, project.name) && (lead.project = name))
      project.name = name
      if (input.active !== undefined) project.active = input.active
    }
    return { projectId: project.id }
  },

  listUsers() {
    viewer()
    return db.users
      .map((u) => ({ ...u }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  },

  createUser(input: { email: string; fullName: string; role: Role }) {
    requireOwner()
    if (db.users.some((u) => same(u.email, input.email))) throw new Error('A user with that email already exists.')
    const id = uuid()
    db.users.push({ id, email: String(input.email).trim().toLowerCase(), fullName: String(input.fullName || '').trim(), role: input.role === 'owner' ? 'owner' : 'employee', active: true })
    return id
  },

  updateUser(input: { id: string; fullName?: string; role?: Role; active?: boolean }) {
    const me = requireOwner()
    const user = db.users.find((u) => u.id === input.id)
    if (!user) throw new Error('That user no longer exists.')
    if (user.id === me.id && (input.active === false || input.role === 'employee')) throw new Error('You cannot remove your own owner access.')
    if (input.fullName !== undefined) user.fullName = String(input.fullName).trim()
    if (input.role !== undefined) user.role = input.role
    if (input.active !== undefined) user.active = input.active
  },

  deleteUser(id: string) {
    const me = requireOwner()
    if (id === me.id) throw new Error('You cannot delete your own account.')
    db.users = db.users.filter((u) => u.id !== id)
    db.leads.forEach((lead) => (lead.assigneeIds = lead.assigneeIds.filter((uid) => uid !== id)))
    db.projects.forEach((p) => (p.memberIds = p.memberIds.filter((uid) => uid !== id)))
  },

  listCampaigns() {
    viewer()
    return db.campaigns
  },

  setCampaignStopped(id: string, stopped: boolean) {
    requireOwner()
    const campaign = db.campaigns.find((c) => c.id === id)
    if (!campaign) throw new Error('That campaign no longer exists.')
    campaign.stopped = stopped
  }
}

export async function call<T>(action: string, ...args: unknown[]): Promise<T> {
  const fn = (API as Record<string, (...a: unknown[]) => unknown>)[action]
  if (!fn) throw new Error('Unknown action.')
  const before = JSON.stringify(db)
  try {
    const result = fn(...args)
    persist()
    return structuredClone(result) as T
  } catch (error) {
    db = JSON.parse(before) as Db
    throw error
  }
}

function seed(): Db {
  let n = 7
  const rand = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const now = Date.now()

  const user = (fullName: string, role: Role, active = true): UserRow => ({
    id: uuid(),
    email: fullName.split(' ')[0].toLowerCase() + '@dgcdemo.in',
    fullName,
    role,
    active
  })
  const owner = user('Anita Desai', 'owner')
  const team = [user('Rahul Verma', 'employee'), user('Sneha Iyer', 'employee'), user('Arjun Mehta', 'employee')]
  const users = [owner, ...team, user('Kiran Rao', 'employee', false)]

  const projects: ProjectRow[] = [
    { id: uuid(), name: 'Green Valley', active: true, memberIds: [team[0].id, team[1].id] },
    { id: uuid(), name: 'Sunrise Villas', active: true, memberIds: [team[1].id, team[2].id] },
    { id: uuid(), name: 'Lake View Plots', active: false, memberIds: [] }
  ]
  const campaigns: CampaignRow[] = [
    { id: uuid(), name: 'Diwali Offer', platform: 'Facebook', sourceId: 'meta', stopped: false, start: '', leads: 0 },
    { id: uuid(), name: 'Villa Reels', platform: 'Instagram', sourceId: 'meta', stopped: false, start: '', leads: 0 },
    { id: uuid(), name: 'Weekend Site Visit', platform: 'Facebook', sourceId: 'meta', stopped: true, start: '', leads: 0 }
  ]

  const first = ['Amit', 'Pooja', 'Vikram', 'Neha', 'Suresh', 'Kavya', 'Rohit', 'Divya', 'Manoj', 'Anjali', 'Sanjay', 'Meera', 'Karan', 'Ritu', 'Deepak', 'Swati', 'Nikhil', 'Lakshmi', 'Gaurav', 'Priya']
  const last = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Gupta', 'Joshi', 'Kumar', 'Singh', 'Bose', 'Menon']
  const working = ['interested', 'call_back_later', 'not_answered', 'sent_details', 'call_after_some_time', 'reg_done', 'not_reachable', 'switched_off']
  const possessions = ['Under 6 months', '6 months to 1 year', 'More than 1 year']
  const priorityFor: Record<string, string> = { 'Under 6 months': 'high', '6 months to 1 year': 'medium', 'More than 1 year': 'low' }
  const notes = ['Wants a corner plot.', 'Asked for the brochure on WhatsApp.', 'Visiting with family on Sunday.', 'Comparing with another builder.', 'Needs a home loan.', null, null]

  const leads: LeadRow[] = []
  const events: EventRow[] = []
  const TODAY = 10
  const sinceMidnight = (now + 5.5 * 3600000) % DAY // ms since midnight in Asia/Kolkata (no DST)
  for (let i = 0; i < 48 + TODAY; i++) {
    const created = new Date(
      i < TODAY
        ? now - Math.floor(rand() * sinceMidnight)
        : now - (Math.floor((i - TODAY) * 1.3) + 1) * DAY - Math.floor(rand() * 8 * 3600000)
    )
    const at = created.toISOString()
    const fromAd = rand() < 0.7
    const campaign = fromAd ? pick(campaigns) : null
    const source = campaign ? campaign.platform : pick(['Walk in', 'Referral', 'Website'])
    const project = rand() < 0.85 ? pick(projects.slice(0, 2)).name : null
    const possession = rand() < 0.7 ? pick(possessions) : null
    const fresh = i < TODAY + 3
    const assigneeIds = fresh && rand() < 0.7 ? [] : [pick(rand() < 0.15 ? [owner] : team).id]
    let status = 'new'
    if (!fresh && assigneeIds.length) {
      const roll = rand()
      status = roll < 0.12 ? 'closed' : roll < 0.22 ? 'lost' : roll < 0.28 ? 'not_interested' : pick(working)
    }
    const touched = new Date(Math.min(now, created.getTime() + Math.floor(rand() * 4) * DAY)).toISOString()
    const followUp = assigneeIds.length && !isTerminal(status) && status !== 'not_interested' && rand() < 0.8
      ? new Date(now + (Math.floor(rand() * 9) - 3) * DAY).toISOString().slice(0, 10) + 'T05:30:00.000Z'
      : null
    const lead: LeadRow = {
      id: uuid(),
      date: at.slice(0, 10),
      name: `${pick(first)} ${pick(last)}`,
      phone: `+91 9${String(Math.floor(rand() * 1e9)).padStart(9, '0')}`,
      source,
      sourceName: campaign ? (campaign.platform === 'Instagram' ? 'Villa form' : 'Plot form') : null,
      project,
      possession,
      status,
      priority: possession ? priorityFor[possession] : status === 'new' ? null : pick(['high', 'medium', 'low']),
      nextFollowUpAt: followUp,
      assigneeIds,
      lostReason: status === 'lost' ? pick(['Price too high', 'Location did not suit', 'Bought elsewhere', 'Loan not approved']) : null,
      notes: status === 'new' ? null : pick(notes),
      createdAt: at,
      updatedAt: touched,
      touchedAt: touched,
      campaign: campaign ? campaign.name : null,
      amount: status === 'closed' ? (15 + Math.floor(rand() * 70)) * 100000 : null
    }
    leads.push(lead)
    if (campaign) {
      campaign.leads += 1
      if (!campaign.start || campaign.start > lead.date) campaign.start = lead.date
    }
    const base = { leadId: lead.id, field: null, from: null, assigneeIds: [] as string[] }
    events.push({ ...base, at, event: 'created', to: null, byName: campaign ? 'Meta' : owner.fullName, reason: 'From ' + (campaign ? campaign.name : source) })
    if (assigneeIds.length) {
      const name = users.find((u) => u.id === assigneeIds[0])!.fullName
      events.push({ ...base, at: new Date(Math.min(now, created.getTime() + 3600000)).toISOString(), event: 'assigned', to: name, byName: owner.fullName, reason: null, assigneeIds })
    }
    if (status !== 'new') {
      const name = users.find((u) => u.id === assigneeIds[0])!.fullName
      events.push({ ...base, at: touched, event: 'updated', field: 'status', from: 'new', to: status, byName: name, reason: null })
    }
  }
  return { users, projects, leads, events, campaigns }
}

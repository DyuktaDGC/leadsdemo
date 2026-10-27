// Mock server: runs the real backend/Code.gs in the browser against an in-memory Google Sheet.
// Sheets and script properties are saved in localStorage. Supabase and Meta are faked below.
import { signedInEmails } from '@shared/lib/supabase'

import code from '../../../backend/Code.gs?raw'

type Cell = string | number
type Store = { sheets: Record<string, Cell[][]>; props: Record<string, string> }
type Row = Record<string, unknown>
type Server = {
  doPost: (e: { postData: { contents: string } }) => { text: string }
  syncMetaLeads: () => number
  append: (name: string, rows: Row[]) => void
  SCHEMA: Record<string, string[]>
}

const KEY = 'leaddgc.mock.v1'
const DAY = 86400000
const SYNC_EVERY = 15 * 60_000 // ponytail: syncs on read instead of an hourly trigger

function loadStore(): Store | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

let store: Store = loadStore() ?? { sheets: {}, props: {} }

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {}
}

function fakeSheet(name: string) {
  const data = () => store.sheets[name]
  const lastRow = () => {
    const rows = data()
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].some((v) => v !== '')) return i + 1
    return 0
  }
  const range = (row: number, col: number, rows: number, cols: number) => ({
    setValues(values: Cell[][]) {
      values.forEach((line, r) => {
        data()[row - 1 + r] ??= []
        line.forEach((v, c) => (data()[row - 1 + r][col - 1 + c] = v))
      })
      return this
    },
    setValue(value: Cell) {
      data()[row - 1] ??= []
      data()[row - 1][col - 1] = value
      return this
    },
    clearContent() {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (data()[row - 1 + r]) data()[row - 1 + r][col - 1 + c] = ''
      return this
    },
    setNumberFormat() {
      return this
    },
    setFontWeight() {
      return this
    }
  })
  return {
    getRange: (row: number, col: number, rows: number, cols: number) => range(row, col, rows, cols),
    getLastRow: lastRow,
    getDataRange: () => ({ getValues: () => data().slice(0, lastRow()).map((line) => [...line]) }),
    setFrozenRows() {}
  }
}

// Meta lead forms: each sync, every running campaign may bring in a new lead.
const FORMS = [
  { id: 'form-plot', name: 'Plot form', status: 'ACTIVE', platform: 'Facebook' },
  { id: 'form-villa', name: 'Villa form', status: 'ACTIVE', platform: 'Instagram' }
]
const FIRST = ['Amit', 'Pooja', 'Vikram', 'Neha', 'Suresh', 'Kavya', 'Rohit', 'Divya', 'Manoj', 'Anjali', 'Sanjay', 'Meera', 'Karan', 'Ritu', 'Deepak', 'Swati', 'Nikhil', 'Lakshmi', 'Gaurav', 'Priya']
const LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Gupta', 'Joshi', 'Kumar', 'Singh', 'Bose', 'Menon']
const pickOf = <T>(list: readonly T[], rand = Math.random) => list[Math.floor(rand() * list.length)]
const phoneOf = (rand = Math.random) => `+91 9${String(Math.floor(rand() * 1e9)).padStart(9, '0')}`

function metaLeads(formId: string) {
  const form = FORMS.find((f) => formId.includes(`/${f.id}/`))
  const header = store.sheets.Campaigns?.[0] ?? []
  const campaigns = (store.sheets.Campaigns ?? []).slice(1).filter((row) => row[header.indexOf('platform')] === form?.platform)
  return campaigns
    .filter(() => Math.random() < 0.4)
    .map((row) => ({
      id: 'meta-' + crypto.randomUUID(),
      created_time: new Date().toISOString().replace('Z', '+0000'),
      campaign_id: String(row[header.indexOf('id')]),
      campaign_name: String(row[header.indexOf('name')]),
      platform: form?.platform === 'Instagram' ? 'ig' : 'fb',
      field_data: [
        { name: 'full_name', values: [`${pickOf(FIRST)} ${pickOf(LAST)}`] },
        { name: 'phone_number', values: [phoneOf()] }
      ]
    }))
}

function fakeFetch(url: string, options: { headers?: Record<string, string> } = {}) {
  const reply = (status: number, body: unknown) => ({ getResponseCode: () => status, getContentText: () => JSON.stringify(body) })
  if (url.includes('/auth/v1/user')) {
    const email = options.headers?.Authorization.replace('Bearer ', '')
    return email ? reply(200, { email }) : reply(401, { msg: 'invalid JWT' })
  }
  if (url.includes('/auth/v1/invite')) return reply(200, {})
  if (url.includes('/auth/v1/admin/users')) {
    return reply(200, { users: signedInEmails().map((email) => ({ email, last_sign_in_at: new Date().toISOString() })) })
  }
  if (url.includes('/leadgen_forms')) return reply(200, { data: FORMS })
  if (url.includes('/leads?')) return reply(200, { data: metaLeads(url) })
  return reply(200, { data: [] })
}

const globals = {
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (name: string) => (store.sheets[name] ? fakeSheet(name) : null),
      insertSheet: (name: string) => ((store.sheets[name] = []), fakeSheet(name))
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k: string) => store.props[k] ?? null,
      setProperty: (k: string, v: string) => (store.props[k] = v),
      deleteProperty: (k: string) => delete store.props[k]
    })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: (_alg: string, text: string) => [...new TextEncoder().encode(text)],
    base64Encode: (bytes: number[]) => btoa(String.fromCharCode(...bytes))
  },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (text: string) => ({
      text,
      setMimeType() {
        return this
      }
    })
  },
  ScriptApp: {
    getProjectTriggers: () => [],
    deleteTrigger() {},
    newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }), everyMinutes: () => ({ create() {} }) }) })
  },
  UrlFetchApp: { fetch: fakeFetch }
}

const server = new Function(...Object.keys(globals), `${code}\nreturn { doPost, syncMetaLeads, append, SCHEMA }`)(
  ...Object.values(globals)
) as Server

if (!store.sheets.Users) seed()

export function post(action: string, args: unknown[], token: string | null): { ok: boolean; data?: unknown; error?: string } {
  if (action === 'listLeads' && Date.now() - Date.parse(store.props.META_SYNCED_AT ?? '') > SYNC_EVERY) {
    try {
      server.syncMetaLeads()
    } catch {}
  }
  const before = JSON.stringify(store)
  const body = JSON.parse(server.doPost({ postData: { contents: JSON.stringify({ action, args, token }) } }).text)
  if (body.ok) persist()
  else store = JSON.parse(before)
  return body
}

function seed() {
  store = {
    sheets: {},
    props: {
      SUPABASE_URL: 'https://mock.supabase.local',
      SUPABASE_ANON_KEY: 'mock-anon',
      SUPABASE_SERVICE_KEY: 'mock-service',
      META_PAGE_TOKEN: 'mock-meta',
      META_SYNCED_AT: new Date().toISOString()
    }
  }
  for (const [name, header] of Object.entries(server.SCHEMA)) store.sheets[name] = [[...header]]

  let n = 7
  const rand = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646
  const pick = <T>(list: readonly T[]) => pickOf(list, rand)
  const uuid = () => crypto.randomUUID()
  const now = Date.now()

  const user = (fullName: string, role: string, active = true) => ({
    id: uuid(),
    email: fullName.split(' ')[0].toLowerCase() + '@dgcdemo.in',
    fullName,
    role,
    active
  })
  const owner = user('Anita Desai', 'owner')
  const team = [user('Rahul Verma', 'employee'), user('Sneha Iyer', 'employee'), user('Arjun Mehta', 'employee')]
  const users = [owner, ...team, user('Kiran Rao', 'employee', false)]
  const nameOf = (id: string) => users.find((u) => u.id === id)!.fullName

  const projects = [
    { id: uuid(), name: 'Green Valley', active: true, memberIds: [team[0].id, team[1].id] },
    { id: uuid(), name: 'Sunrise Villas', active: true, memberIds: [team[1].id, team[2].id] },
    { id: uuid(), name: 'Lake View Plots', active: false, memberIds: [] }
  ]
  const campaigns = [
    { id: uuid(), name: 'Diwali Offer', platform: 'Facebook', sourceId: 'meta', stopped: false, start: '', leads: 0 },
    { id: uuid(), name: 'Villa Reels', platform: 'Instagram', sourceId: 'meta', stopped: false, start: '', leads: 0 },
    { id: uuid(), name: 'Weekend Site Visit', platform: 'Facebook', sourceId: 'meta', stopped: true, start: '', leads: 0 }
  ]

  const working = ['interested', 'call_back_later', 'not_answered', 'sent_details', 'call_after_some_time', 'reg_done', 'not_reachable', 'switched_off']
  const possessions = ['Under 6 months', '6 months to 1 year', 'More than 1 year']
  const priorityFor: Record<string, string> = { 'Under 6 months': 'high', '6 months to 1 year': 'medium', 'More than 1 year': 'low' }
  const notes = ['Wants a corner plot.', 'Asked for the brochure on WhatsApp.', 'Visiting with family on Sunday.', 'Comparing with another builder.', 'Needs a home loan.', null, null]

  const leads: Row[] = []
  const events: Row[] = []
  const TODAY = 10
  const sinceMidnight = (now + 5.5 * 3600000) % DAY // ms since midnight in Asia/Kolkata (no DST)
  for (let i = 0; i < 48 + TODAY; i++) {
    const created = new Date(
      i < TODAY
        ? now - Math.floor(rand() * sinceMidnight)
        : now - (Math.floor((i - TODAY) * 1.3) + 1) * DAY - Math.floor(rand() * 8 * 3600000)
    )
    const at = created.toISOString()
    const campaign = rand() < 0.7 ? pick(campaigns) : null
    const source = campaign ? campaign.platform : owner.fullName
    const project = rand() < 0.85 ? pick(projects.slice(0, 2)).name : null
    const possession = rand() < 0.7 ? pick(possessions) : null
    const fresh = i < TODAY + 3
    const assigneeIds = fresh && rand() < 0.7 ? [] : [pick(rand() < 0.15 ? [owner] : team).id]
    let status = 'new'
    if (!fresh && assigneeIds.length) {
      const roll = rand()
      status = roll < 0.12 ? 'closed' : roll < 0.22 ? 'lost' : roll < 0.28 ? 'not_interested' : pick(working)
    }
    const terminal = status === 'closed' || status === 'lost'
    const touched = new Date(Math.min(now, created.getTime() + Math.floor(rand() * 4) * DAY)).toISOString()
    const followUp =
      assigneeIds.length && !terminal && status !== 'not_interested' && rand() < 0.8
        ? new Date(now + (Math.floor(rand() * 9) - 3) * DAY).toISOString().slice(0, 10) + 'T05:30:00.000Z'
        : null
    const lead = {
      id: uuid(),
      date: at.slice(0, 10),
      name: `${pick(FIRST)} ${pick(LAST)}`,
      phone: phoneOf(rand),
      source,
      sourceName: campaign ? (campaign.platform === 'Instagram' ? 'Villa form' : 'Plot form') : 'walk-ins.xlsx',
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
      metaId: campaign ? 'meta-seed-' + i : null,
      campaign: campaign ? campaign.name : null,
      amount: status === 'closed' ? (15 + Math.floor(rand() * 70)) * 100000 : null
    }
    leads.push(lead)
    if (campaign) {
      campaign.leads += 1
      if (!campaign.start || campaign.start > lead.date) campaign.start = lead.date
    }
    const base = { leadId: lead.id, field: null, from: null, assigneeIds: [] as string[] }
    events.push({ ...base, at, event: 'created', to: null, byName: campaign ? 'Meta' : owner.fullName, reason: 'From ' + (campaign ? campaign.name : lead.sourceName) })
    if (assigneeIds.length) {
      const assignedAt = Math.min(now, created.getTime() + 3600000)
      events.push({ ...base, at: new Date(assignedAt).toISOString(), event: 'assigned', to: nameOf(assigneeIds[0]), byName: owner.fullName, reason: null, assigneeIds })
      const calls = Math.floor(rand() * 4)
      for (let c = 0; c < calls; c++) {
        const callAt = new Date(assignedAt + rand() * (now - assignedAt)).toISOString()
        events.push({ ...base, at: callAt, event: 'call', to: null, byName: nameOf(assigneeIds[0]), reason: null, assigneeIds })
      }
    }
    if (status !== 'new') {
      events.push({ ...base, at: touched, event: 'updated', field: 'status', from: 'new', to: status, byName: nameOf(assigneeIds[0]), reason: null })
    }
    if (rand() < 0.08) {
      events.push({ ...base, at: new Date(Math.min(now, created.getTime() + 2 * DAY)).toISOString(), event: 'repeat', to: null, byName: campaign ? 'Meta' : owner.fullName, reason: 'From ' + (campaign ? campaign.name : lead.sourceName) })
    }
  }

  server.append('Users', users)
  server.append('Projects', projects)
  server.append('Leads', leads)
  server.append('Events', events)
  server.append('Campaigns', campaigns)
  server.append('Sources', [{ id: 'meta', connected: true }])
  persist()
}

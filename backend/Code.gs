const GRAPH = 'https://graph.facebook.com/v23.0'
const DAY = 86400000

const SCHEMA = {
  Users: ['id', 'email', 'fullName', 'role', 'active'],
  Projects: ['id', 'name', 'active', 'memberIds'],
  Leads: ['id', 'date', 'name', 'phone', 'source', 'sourceName', 'project', 'possession', 'status', 'priority', 'nextFollowUpAt', 'assigneeIds', 'lostReason', 'notes', 'createdAt', 'updatedAt', 'touchedAt', 'metaId', 'campaign', 'amount'],
  Events: ['leadId', 'at', 'event', 'field', 'from', 'to', 'byName', 'reason', 'assigneeIds'],
  Queue: ['id', 'at', 'name', 'phone', 'source', 'sourceName', 'campaign', 'metaId', 'result', 'processedAt'],
  Campaigns: ['id', 'name', 'platform', 'sourceId', 'stopped', 'start', 'leads'],
  Sources: ['id', 'connected']
}
const LISTS = ['assigneeIds', 'memberIds']
const FLAGS = ['active', 'stopped', 'connected']
const NUMBERS = ['leads']

const STATUSES = ['new', 'call_after_some_time', 'call_back_later', 'interested', 'invalid_number', 'lost', 'not_answered', 'not_interested', 'not_reachable', 'reg_done', 'sent_details', 'switched_off', 'closed']
const EDITABLE = ['name', 'source', 'sourceName', 'project', 'possession', 'status', 'priority', 'nextFollowUpAt', 'notes', 'lostReason', 'amount']
const READS = ['currentSession', 'performance', 'callStats', 'listLeads', 'listProjects', 'listUsers', 'listCampaigns', 'listSources']

const isTerminal = (status) => status === 'closed' || status === 'lost'
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const asText = (value) => (value === null || value === undefined ? null : String(value))
const phoneKey = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}
const nowIso = () => new Date().toISOString()

let session = null

function decode(column, value) {
  if (value instanceof Date) return value.toISOString()
  if (LISTS.includes(column)) return String(value || '').split(',').filter(Boolean)
  if (FLAGS.includes(column)) return value === true || value === 'TRUE' || value === 'true'
  if (NUMBERS.includes(column)) return Number(value) || 0
  return value === '' || value === null || value === undefined ? null : String(value)
}

function encode(column, value) {
  if (LISTS.includes(column)) return (value || []).join(',')
  if (FLAGS.includes(column)) return value ? 'TRUE' : 'FALSE'
  return value === null || value === undefined ? '' : value
}

function sheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name)
}

function read(name) {
  const values = sheet(name).getDataRange().getValues()
  const header = values[0]
  return values.slice(1).map((row) => {
    const item = {}
    header.forEach((column, i) => (item[column] = decode(column, row[i])))
    return item
  })
}

function save(name, rows) {
  const header = SCHEMA[name]
  const target = sheet(name)
  const old = target.getLastRow() - 1
  if (old > 0) target.getRange(2, 1, old, header.length).clearContent()
  if (rows.length) target.getRange(2, 1, rows.length, header.length).setValues(rows.map((row) => header.map((c) => encode(c, row[c]))))
}

function append(name, rows) {
  if (!rows.length) return
  const header = SCHEMA[name]
  const target = sheet(name)
  target.getRange(target.getLastRow() + 1, 1, rows.length, header.length).setValues(rows.map((row) => header.map((c) => encode(c, row[c]))))
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  try {
    const { action, args, token } = JSON.parse(e.postData.contents)
    const fn = API[action]
    if (!fn) throw new Error('Unknown action.')
    const email = token ? emailFor(token) : null
    session = email ? { email } : null
    if (READS.includes(action)) return json({ ok: true, data: fn(...(args || [])) })
    const lock = LockService.getScriptLock()
    lock.waitLock(20000)
    try {
      return json({ ok: true, data: fn(...(args || [])) })
    } finally {
      lock.releaseLock()
    }
  } catch (err) {
    return json({ ok: false, error: err.message })
  }
}

function props() {
  return PropertiesService.getScriptProperties()
}

function digest(text) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text))
}

function supabase(path, key, method, payload) {
  const url = props().getProperty('SUPABASE_URL')
  const anon = props().getProperty('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('Apps Script is missing the SUPABASE_URL or SUPABASE_ANON_KEY script property.')
  const options = { method: method || 'get', muteHttpExceptions: true, contentType: 'application/json', headers: { apikey: anon, Authorization: 'Bearer ' + key } }
  if (payload) options.payload = JSON.stringify(payload)
  const res = UrlFetchApp.fetch(url.replace(/\/$/, '') + path, options)
  const text = res.getContentText()
  return { status: res.getResponseCode(), body: text ? JSON.parse(text) : null }
}

function admin(path, method, payload) {
  const key = props().getProperty('SUPABASE_SERVICE_KEY')
  return key ? supabase(path, key, method, payload) : null
}

function emailFor(token) {
  const cache = CacheService.getScriptCache()
  const key = 'auth_' + digest(token)
  const cached = cache.get(key)
  if (cached) return cached
  const res = supabase('/auth/v1/user', token)
  if (res.status !== 200 || !res.body || !res.body.email) return null
  cache.put(key, res.body.email, 300)
  return res.body.email
}

function invite(email) {
  const appUrl = String(props().getProperty('APP_URL') || '').replace(/\/$/, '')
  const redirect = appUrl ? '?redirect_to=' + encodeURIComponent(appUrl + '/set-password') : ''
  const res = admin('/auth/v1/invite' + redirect, 'post', { email })
  if (res && res.status >= 300 && res.status !== 422) throw new Error((res.body && (res.body.msg || res.body.message)) || 'Could not send the invite email.')
}

function viewer() {
  const user = session && read('Users').find((row) => same(row.email, session.email) && row.active)
  if (!user) throw new Error('Your session has expired. Sign in again.')
  return { id: user.id, name: user.fullName, role: user.role }
}

function requireOwner() {
  const me = viewer()
  if (me.role !== 'owner') throw new Error('Only the owner can do that.')
  return me
}

function projectNamesOf(projects, me) {
  return projects.filter((p) => p.active && p.memberIds.includes(me.id)).map((p) => p.name)
}

function canSee(row, me, myProjects) {
  if (me.role === 'owner') return true
  if (row.assigneeIds.includes(me.id)) return true
  if (row.assigneeIds.length > 0) return false
  return !row.project || myProjects.some((name) => same(name, row.project))
}

function campaignOf(events) {
  const created = events.find((event) => event.event === 'created' && event.byName === 'Meta')
  return created && created.reason ? String(created.reason).replace(/^From /, '') : null
}

function toLead(row, events, me, names, now) {
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
    campaign: row.campaign || campaignOf(events),
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

function normalize(field, value) {
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

function updateLead(lead, changes, reason, me, events) {
  if (me.role !== 'owner' && !lead.assigneeIds.includes(me.id)) throw new Error('Only the people handling this lead can change it.')
  const patch = {}
  const now = nowIso()
  for (const field of EDITABLE) {
    if (!(field in changes)) continue
    const value = normalize(field, changes[field])
    if (asText(lead[field]) === asText(value)) continue
    patch[field] = value
    events.push({ leadId: lead.id, at: now, event: 'updated', field, from: asText(lead[field]), to: asText(value), byName: me.name, reason, assigneeIds: [] })
  }
  const nextStatus = patch.status || lead.status
  const nextLost = 'lostReason' in patch ? patch.lostReason : lead.lostReason
  if (nextStatus === 'lost' && !nextLost) throw new Error('Say why the lead was lost.')
  if (nextStatus === 'closed' && !('amount' in patch ? patch.amount : lead.amount)) throw new Error('Enter the deal amount for a closed lead.')
  if (!events.length) return { noop: true }
  Object.assign(lead, patch, { updatedAt: now, touchedAt: now })
  return {}
}

function assignLeads(leads, toUserIds, reason, me, events) {
  const active = {}
  read('Users').filter((user) => user.active).forEach((user) => (active[user.id] = user))
  const targets = [...new Set(toUserIds)]
  if (!targets.length) throw new Error('Pick at least one person to handle this lead.')
  if (targets.some((id) => !active[id])) throw new Error('One of those people no longer has access.')
  const results = []
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

const API = {
  currentSession() {
    const user = session && read('Users').find((row) => same(row.email, session.email) && row.active)
    return user ? { userId: user.id, email: user.email, fullName: user.fullName, role: user.role } : null
  },

  performance() {
    const me = viewer()
    const closedAt = {}
    read('Events').forEach((event) => event.field === 'status' && event.to === 'closed' && (closedAt[event.leadId] = event.at))
    const totals = {}
    const mine = []
    read('Leads').forEach((lead) => {
      if (lead.status !== 'closed' || !lead.assigneeIds.length) return
      const share = (Number(lead.amount) || 0) / lead.assigneeIds.length
      lead.assigneeIds.forEach((id) => (totals[id] = (totals[id] || 0) + share))
      if (lead.assigneeIds.includes(me.id)) mine.push({ leadId: lead.id, name: lead.name, closedAt: closedAt[lead.id] || lead.updatedAt, amount: share })
    })
    const board = read('Users')
      .filter((user) => user.active)
      .map((user) => ({ name: user.fullName, amount: totals[user.id] || 0, you: user.id === me.id }))
      .sort((a, b) => b.amount - a.amount)
    return { mine, board }
  },

  listLeads(query) {
    query = query || {}
    const me = viewer()
    const users = read('Users')
    const names = {}
    users.forEach((user) => (names[user.id] = user.fullName))
    const active = read('Projects').filter((p) => p.active)
    const myProjects = projectNamesOf(active, me)
    const visible = read('Leads')
      .filter((row) => canSee(row, me, myProjects))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)))
    const inRange = visible.filter((row) => {
      if (query.month) return String(row.date).startsWith(query.month)
      if (query.from && row.date < query.from) return false
      if (query.to && row.date > query.to) return false
      return true
    })
    const byLead = {}
    read('Events').forEach((event) => (byLead[event.leadId] = byLead[event.leadId] || []).push(event))
    const now = Date.now()
    const leads = inRange.map((row) => toLead(row, byLead[row.id] || [], me, names, now))
    return {
      leads,
      months: [...new Set(visible.map((row) => String(row.date).slice(0, 7)))].sort().reverse(),
      syncedAt: props().getProperty('META_SYNCED_AT'),
      roster: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName, role: u.role, projects: active.filter((p) => p.memberIds.includes(u.id)).length }))
    }
  },

  writeLead(input) {
    const me = viewer()
    const reason = clean(input.reason)
    const ids = new Set([...(input.leadIds || []), ...(input.leadId ? [input.leadId] : [])])
    if (!ids.size) throw new Error('Pick a lead first.')
    const all = read('Leads')
    const leads = all.filter((row) => ids.has(row.id))
    if (!leads.length) throw new Error('That lead no longer exists.')
    const events = []
    let response
    if (input.action === 'update') response = updateLead(leads[0], input.changes || {}, reason, me, events)
    else if (input.action === 'assign') response = assignLeads(leads, input.toUserIds || [], reason, me, events)
    else throw new Error('Unknown action.')
    if (events.length) {
      save('Leads', all)
      append('Events', events)
    }
    return response
  },

  logCall(leadId) {
    const me = viewer()
    const all = read('Leads')
    const index = all.findIndex((row) => row.id === leadId)
    if (index < 0 || !canSee(all[index], me, projectNamesOf(read('Projects'), me))) throw new Error('That lead no longer exists.')
    const now = nowIso()
    sheet('Leads').getRange(index + 2, SCHEMA.Leads.indexOf('touchedAt') + 1).setValue(now)
    append('Events', [{ leadId, at: now, event: 'call', field: null, from: null, to: null, byName: me.name, reason: null, assigneeIds: [me.id] }])
  },

  callStats() {
    const me = viewer()
    const owner = me.role === 'owner'
    const leads = {}
    read('Leads').forEach((lead) => (leads[lead.id] = lead))
    const gone = { name: 'Deleted lead', project: null, campaign: null }
    const calls = read('Events')
      .filter((e) => e.event === 'call' && (owner || e.assigneeIds.includes(me.id)))
      .map((e) => {
        const lead = leads[e.leadId] || gone
        return { at: e.at, leadId: e.leadId, leadName: lead.name, project: lead.project, campaign: lead.campaign, userId: e.assigneeIds[0] || null, userName: e.byName }
      })
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    const people = owner ? read('Users').filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName })) : []
    return { calls, people }
  },

  listProjects() {
    viewer()
    const names = {}
    read('Users').forEach((user) => (names[user.id] = user.fullName))
    return read('Projects').map((p) => Object.assign(p, { memberNames: p.memberIds.map((id) => names[id] || 'Former user') }))
  },

  writeProject(input) {
    requireOwner()
    const projects = read('Projects')
    if (input.action === 'addProject') {
      const name = clean(input.name)
      if (!name) throw new Error('Name the project.')
      if (projects.some((p) => same(p.name, name))) throw new Error('A project with that name already exists.')
      const id = Utilities.getUuid()
      append('Projects', [{ id, name, active: true, memberIds: [] }])
      return { projectId: id }
    }
    if (input.action === 'setUserProjects') {
      const picked = new Set(input.projectIds)
      projects.filter((p) => p.active).forEach((p) => (p.memberIds = [...p.memberIds.filter((id) => id !== input.userId), ...(picked.has(p.id) ? [input.userId] : [])]))
      save('Projects', projects)
      return {}
    }
    const project = projects.find((p) => p.id === input.projectId)
    if (!project) throw new Error('That project no longer exists.')
    if (input.action === 'deleteProject') {
      save('Projects', projects.filter((p) => p.id !== project.id))
      return { projectId: project.id }
    }
    if (input.action === 'setMembers') project.memberIds = [...new Set(input.userIds)]
    else {
      const name = input.name === undefined ? project.name : clean(input.name)
      if (!name) throw new Error('Name the project.')
      if (name !== project.name) {
        const leads = read('Leads')
        leads.forEach((lead) => same(lead.project, project.name) && (lead.project = name))
        save('Leads', leads)
      }
      project.name = name
      if (input.active !== undefined) project.active = input.active
    }
    save('Projects', projects)
    return { projectId: project.id }
  },

  listUsers() {
    viewer()
    const res = admin('/auth/v1/admin/users?per_page=1000')
    const signedIn = new Set(((res && res.body && res.body.users) || []).filter((u) => u.last_sign_in_at).map((u) => String(u.email).toLowerCase()))
    return read('Users')
      .map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, active: u.active, pending: res ? !signedIn.has(String(u.email).toLowerCase()) : false }))
      .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)))
  },

  createUser(input) {
    requireOwner()
    const users = read('Users')
    if (users.some((u) => same(u.email, input.email))) throw new Error('A user with that email already exists.')
    const email = String(input.email).trim().toLowerCase()
    invite(email)
    const id = Utilities.getUuid()
    append('Users', [{ id, email, fullName: String(input.fullName || '').trim(), role: input.role === 'owner' ? 'owner' : 'employee', active: true }])
    return id
  },

  updateUser(input) {
    const me = requireOwner()
    const users = read('Users')
    const user = users.find((u) => u.id === input.id)
    if (!user) throw new Error('That user no longer exists.')
    if (user.id === me.id && (input.active === false || input.role === 'employee')) throw new Error('You cannot remove your own owner access.')
    if (input.fullName !== undefined) user.fullName = String(input.fullName).trim()
    if (input.role !== undefined) user.role = input.role
    if (input.active !== undefined) user.active = input.active
    save('Users', users)
  },

  deleteUser(id) {
    const me = requireOwner()
    if (id === me.id) throw new Error('You cannot delete your own account.')
    save('Users', read('Users').filter((u) => u.id !== id))
    const leads = read('Leads')
    leads.forEach((lead) => (lead.assigneeIds = lead.assigneeIds.filter((uid) => uid !== id)))
    save('Leads', leads)
    const projects = read('Projects')
    projects.forEach((p) => (p.memberIds = p.memberIds.filter((uid) => uid !== id)))
    save('Projects', projects)
  },

  importLeads(rows, fileName) {
    const me = viewer()
    if (!Array.isArray(rows) || !rows.length) throw new Error('The file has no leads.')
    if (rows.length > 5000) throw new Error('Upload at most 5000 leads at a time.')
    const at = nowIso()
    const queued = rows.map((row) => ({ id: Utilities.getUuid(), at, name: clean(asText(row.name)), phone: clean(asText(row.phone)), source: me.name, sourceName: clean(fileName), campaign: null, metaId: null, result: null, processedAt: null }))
    append('Queue', queued)
    drainQueue()
    const ids = new Set(queued.map((row) => row.id))
    const results = read('Queue').filter((row) => ids.has(row.id)).map((row) => String(row.result))
    return {
      added: results.filter((r) => r.startsWith('added')).length,
      repeats: results.filter((r) => r.startsWith('duplicate')).length,
      rejected: results.filter((r) => r.startsWith('rejected')).length
    }
  },

  listCampaigns() {
    viewer()
    return read('Campaigns')
  },

  listSources() {
    viewer()
    const error = props().getProperty('META_SYNC_ERROR')
    return read('Sources').map((s) => (s.id === 'meta' ? { ...s, error } : s))
  },

  setMetaConnected(on) {
    const me = requireOwner()
    props().setProperty('META_TOGGLED', (on ? 'on' : 'off') + ' by ' + me.name + ' at ' + nowIso())
    const sources = read('Sources')
    let meta = sources.find((s) => s.id === 'meta')
    if (!meta) sources.push((meta = { id: 'meta' }))
    meta.connected = on
    save('Sources', sources)
  }
}

function setup() {
  const book = SpreadsheetApp.getActive()
  Object.keys(SCHEMA).forEach((name) => {
    const target = book.getSheetByName(name) || book.insertSheet(name)
    target.getRange('A:Z').setNumberFormat('@')
    target.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold')
    target.setFrozenRows(1)
  })
  const ownerEmail = props().getProperty('OWNER_EMAIL')
  if (ownerEmail && !read('Users').some((u) => same(u.email, ownerEmail))) {
    append('Users', [{ id: Utilities.getUuid(), email: ownerEmail.trim().toLowerCase(), fullName: 'Owner', role: 'owner', active: true }])
    invite(ownerEmail.trim().toLowerCase())
  }
  if (!read('Sources').some((s) => s.id === 'meta')) append('Sources', [{ id: 'meta', connected: false }])
  ScriptApp.getProjectTriggers().forEach((t) => t.getHandlerFunction() === 'syncMetaLeads' && ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('syncMetaLeads').timeBased().everyHours(1).create()
  ScriptApp.getProjectTriggers().forEach((t) => t.getHandlerFunction() === 'processQueue' && ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(15).create()
}

function drainQueue() {
  const queue = read('Queue')
  const pending = queue.filter((row) => !row.result)
  if (!pending.length) return 0
  const leads = read('Leads')
  const campaigns = read('Campaigns')
  const byPhone = {}
  leads.forEach((lead) => {
    const key = phoneKey(lead.phone)
    if (key.length === 10 && !byPhone[key]) byPhone[key] = lead.id
  })
  const fresh = []
  const events = []
  const now = nowIso()
  for (const row of pending) {
    const key = phoneKey(row.phone)
    const at = row.at || now
    const byName = row.metaId ? 'Meta' : row.source || 'Queue'
    const reason = 'From ' + (row.campaign || row.sourceName || row.source || 'the queue')
    row.processedAt = now
    if (key.length !== 10) {
      row.result = 'rejected: no valid phone number'
      continue
    }
    if (byPhone[key]) {
      row.result = 'duplicate of ' + byPhone[key]
      events.push({ leadId: byPhone[key], at, event: 'repeat', field: null, from: null, to: null, byName, reason, assigneeIds: [] })
      continue
    }
    const id = Utilities.getUuid()
    byPhone[key] = id
    row.result = 'added as ' + id
    fresh.push({ id, date: at.slice(0, 10), name: clean(row.name) || 'Unknown', phone: row.phone, source: row.source, sourceName: row.sourceName, project: null, possession: null, status: 'new', priority: null, nextFollowUpAt: null, assigneeIds: [], lostReason: null, notes: null, createdAt: at, updatedAt: at, touchedAt: at, metaId: row.metaId, campaign: row.campaign || null })
    events.push({ leadId: id, at, event: 'created', field: null, from: null, to: null, byName, reason, assigneeIds: [] })
    const campaign = row.campaign && campaigns.find((c) => same(c.name, row.campaign))
    if (campaign) campaign.leads += 1
  }
  append('Leads', fresh)
  append('Events', events)
  save('Campaigns', campaigns)
  save('Queue', queue)
  return fresh.length
}

function processQueue() {
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    return drainQueue()
  } finally {
    lock.releaseLock()
  }
}

function fieldValue(lead, ...names) {
  const field = (lead.field_data || []).find((f) => names.includes(f.name))
  return field && field.values && field.values[0] ? String(field.values[0]) : null
}

function graph(url) {
  const body = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText())
  if (body.error) throw new Error('Meta: ' + body.error.message)
  return body
}

function syncMetaLeads() {
  const store = props()
  store.setProperty('META_SYNCED_AT', nowIso())
  const token = store.getProperty('META_PAGE_TOKEN')
  if (!token) return 0
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try {
    const meta = read('Sources').find((s) => s.id === 'meta')
    if (!meta || !meta.connected) return 0
    const only = String(store.getProperty('META_FORM_IDS') || '').split(',').map((f) => f.trim()).filter(Boolean)
    const list = graph(`${GRAPH}/me/leadgen_forms?fields=id,name,status&limit=100&access_token=${token}`)
    const forms = list.data.filter((f) => (only.length ? only.includes(f.id) : f.status === 'ACTIVE'))
    const account = store.getProperty('META_AD_ACCOUNT')
    let live = null
    if (account) {
      const running = graph(`${GRAPH}/act_${account}/campaigns?fields=id&effective_status=${encodeURIComponent('["ACTIVE"]')}&limit=500&access_token=${store.getProperty('META_ADS_TOKEN') || token}`)
      live = new Set(running.data.map((c) => c.id))
    }
    const since = Number(store.getProperty('META_SINCE') || 0)
    const campaigns = read('Campaigns')
    const seenMeta = new Set([...read('Leads'), ...read('Queue')].map((l) => l.metaId).filter(Boolean))
    const queued = []
    let newest = since
    for (const form of forms) {
      const filter = encodeURIComponent(JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: since }]))
      let url = `${GRAPH}/${form.id}/leads?fields=id,created_time,field_data,campaign_id,campaign_name,platform&limit=100&filtering=${filter}&access_token=${token}`
      while (url) {
        const page = graph(url)
        for (const item of page.data || []) {
          const created = Date.parse(String(item.created_time).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'))
          newest = Math.max(newest, Math.floor(created / 1000))
          const phone = fieldValue(item, 'phone_number', 'phone')
          if (seenMeta.has(item.id) || (live && !live.has(item.campaign_id))) continue
          const platform = /^(ig|instagram)$/i.test(item.platform || '') ? 'Instagram' : 'Facebook'
          const name = item.campaign_name || 'Meta lead form'
          const day = new Date(created).toISOString().slice(0, 10)
          let campaign = campaigns.find((c) => c.sourceId === 'meta' && same(c.name, name))
          if (!campaign) {
            campaign = { id: Utilities.getUuid(), name, platform, sourceId: 'meta', stopped: false, start: day, leads: 0 }
            campaigns.push(campaign)
          }
          if (campaign.stopped) continue
          if (String(campaign.start) > day) campaign.start = day
          seenMeta.add(item.id)
          queued.push({ id: Utilities.getUuid(), at: new Date(created).toISOString(), name: fieldValue(item, 'full_name', 'name'), phone, source: platform, sourceName: form.name || name, campaign: name, metaId: item.id, result: null, processedAt: null })
        }
        url = page.paging && page.paging.next
      }
    }
    append('Queue', queued)
    save('Campaigns', campaigns)
    store.setProperty('META_SINCE', String(newest))
    store.deleteProperty('META_SYNC_ERROR')
    return drainQueue()
  } catch (err) {
    store.setProperty('META_SYNC_ERROR', err.message)
    throw err
  } finally {
    lock.releaseLock()
  }
}

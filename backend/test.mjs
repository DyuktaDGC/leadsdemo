import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function fakeSheet() {
  const data = []
  const lastRow = () => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i].some((v) => v !== '')) return i + 1
    return 0
  }
  const range = (row, col, rows, cols) => ({
    setValues(values) {
      values.forEach((line, r) => {
        data[row - 1 + r] ??= []
        line.forEach((v, c) => (data[row - 1 + r][col - 1 + c] = v))
      })
      return this
    },
    setValue(value) {
      data[row - 1] ??= []
      data[row - 1][col - 1] = value
      return this
    },
    clearContent() {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (data[row - 1 + r]) data[row - 1 + r][col - 1 + c] = ''
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
    getRange: (row, col, rows, cols) => (typeof row === 'string' ? range(1, 1, 0, 0) : range(row, col, rows, cols)),
    getLastRow: lastRow,
    getDataRange: () => ({ getValues: () => data.slice(0, lastRow()).map((line) => [...line]) }),
    setFrozenRows() {}
  }
}

const sheets = {}
const props = {}
let metaPages = []
const supabaseTokens = { 'tok-owner': 'owner@dgc.test', 'tok-emp': 'emp@dgc.test' }
const invited = []
const signedIn = new Set()

function fakeFetch(url, options = {}) {
  const reply = (status, body) => ({ getResponseCode: () => status, getContentText: () => JSON.stringify(body) })
  if (url.includes('/auth/v1/user')) {
    const email = supabaseTokens[options.headers.Authorization.replace('Bearer ', '')]
    return email ? reply(200, { email }) : reply(401, { msg: 'invalid JWT' })
  }
  if (url.includes('/auth/v1/invite')) {
    invited.push(JSON.parse(options.payload).email)
    return reply(200, {})
  }
  if (url.includes('/auth/v1/admin/users')) return reply(200, { users: [...signedIn].map((email) => ({ email, last_sign_in_at: '2026-10-16T00:00:00Z' })) })
  if (url.includes('/act_123/campaigns')) return url.endsWith('access_token=ads') ? reply(200, { data: [{ id: 'c-Reels' }] }) : reply(200, { error: { message: 'Unsupported get request' } })
  if (url.includes('/leadgen_forms')) return reply(200, { data: [{ id: 'form1', name: 'Plot form', status: 'ACTIVE' }, { id: 'form2', name: 'Villa form', status: 'ACTIVE' }, { id: 'form3', name: 'Old form', status: 'ARCHIVED' }] })
  return reply(200, metaPages.shift() ?? { data: [] })
}

const context = vm.createContext({
  SpreadsheetApp: {
    getActive: () => ({
      getSheetByName: (name) => sheets[name] ?? null,
      insertSheet: (name) => (sheets[name] = fakeSheet())
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => props[k] ?? null,
      setProperty: (k, v) => (props[k] = v),
      deleteProperty: (k) => delete props[k]
    })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
  Utilities: {
    getUuid: randomUUID,
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: (_alg, text) => [...createHash('sha256').update(text).digest()],
    base64Encode: (bytes) => Buffer.from(bytes).toString('base64')
  },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (text) => ({ text, setMimeType() { return this } })
  },
  ScriptApp: {
    getProjectTriggers: () => [],
    deleteTrigger() {},
    newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }), everyMinutes: () => ({ create() {} }) }) })
  },
  UrlFetchApp: { fetch: fakeFetch }
})
vm.runInContext(readFileSync(new URL('./Code.gs', import.meta.url), 'utf8'), context)

const call = (action, args = [], token) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ action, args, token }) } }).text)
const ok = (action, args, token) => {
  const res = call(action, args, token)
  assert.equal(res.ok, true, `${action}: ${res.error}`)
  return res.data
}
const fails = (action, args, token, message) => {
  const res = call(action, args, token)
  assert.equal(res.ok, false, `${action} should fail`)
  assert.match(res.error, message)
}
const metaLead = (id, phone, campaign, platform = 'fb') => ({
  id,
  created_time: '2026-10-15T10:00:00+0530',
  campaign_id: 'c-' + campaign,
  campaign_name: campaign,
  platform,
  field_data: [
    { name: 'full_name', values: ['Lead ' + id] },
    { name: 'phone_number', values: [phone] }
  ]
})

Object.assign(props, { OWNER_EMAIL: 'owner@dgc.test', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'service', APP_URL: 'https://app.example' })
context.setup()
assert.deepEqual(invited, ['owner@dgc.test'])

const owner = 'tok-owner'
assert.equal(ok('currentSession', [], owner).role, 'owner')
assert.equal(ok('currentSession', [], 'bad-token'), null)
fails('listLeads', [{}], 'bad-token', /expired/)

const empId = ok('createUser', [{ email: 'emp@dgc.test', fullName: 'Emp One', role: 'employee' }], owner)
assert.deepEqual(invited, ['owner@dgc.test', 'emp@dgc.test'])
signedIn.add('owner@dgc.test')
assert.deepEqual(ok('listUsers', [], owner).map((u) => [u.email, u.pending]), [['emp@dgc.test', true], ['owner@dgc.test', false]])
const projectId = ok('writeProject', [{ action: 'addProject', name: 'Green Valley' }], owner).projectId
ok('writeProject', [{ action: 'setMembers', projectId, userIds: [empId] }], owner)
const spareId = ok('writeProject', [{ action: 'addProject', name: 'Spare' }], owner).projectId
const members = () => JSON.stringify(context.read('Projects').map((p) => [p.name, p.memberIds]))
ok('writeProject', [{ action: 'setUserProjects', userId: empId, projectIds: [spareId] }], owner)
assert.equal(members(), JSON.stringify([['Green Valley', []], ['Spare', [empId]]]))
ok('writeProject', [{ action: 'setUserProjects', userId: empId, projectIds: [projectId] }], owner)
assert.equal(members(), JSON.stringify([['Green Valley', [empId]], ['Spare', []]]))
ok('writeProject', [{ action: 'deleteProject', projectId: spareId }], owner)

ok('setMetaConnected', [true], owner)
props.META_PAGE_TOKEN = 'token'
props.META_FORM_IDS = 'form1'
metaPages = [{ data: [metaLead('m1', 'p:+919876543210', 'Diwali Offer'), metaLead('m2', '+918888777766', 'Reels', 'ig'), metaLead('m3', '9876543210', 'Diwali Offer')] }]
assert.equal(context.syncMetaLeads(), 2)
metaPages = [{ data: [metaLead('m1', 'p:+919876543210', 'Diwali Offer')] }]
assert.equal(context.syncMetaLeads(), 0)
metaPages = [{ error: { message: 'API access blocked.' } }]
assert.throws(() => context.syncMetaLeads(), /API access blocked/)
assert.equal(ok('listSources', [], owner)[0].error, 'Meta: API access blocked.')
assert.equal(context.syncMetaLeads(), 0)
assert.equal(ok('listSources', [], owner)[0].error, null)
assert.equal(context.read('Queue').find((q) => q.metaId === 'm3').result.startsWith('duplicate of '), true)

context.append('Queue', [
  { id: 'q1', at: '2026-10-16T05:00:00.000Z', name: 'Walk in', phone: '+91 98765-43210', source: 'Walk in' },
  { id: 'q2', at: '2026-10-16T05:00:00.000Z', name: 'Bad number', phone: '12345', source: 'Walk in' },
  { id: 'q3', at: '2026-10-16T05:00:00.000Z', name: 'Referral', phone: '9000000001', source: 'Referral' },
  { id: 'q4', at: '2026-10-16T05:00:00.000Z', name: 'Referral again', phone: '09000000001', source: 'Referral' }
])
assert.equal(context.processQueue(), 1)
assert.equal(context.processQueue(), 0)
const queue = Object.fromEntries(context.read('Queue').map((q) => [q.id, q.result]))
assert.match(queue.q1, /^duplicate of /)
assert.match(queue.q2, /^rejected/)
assert.match(queue.q3, /^added as /)
assert.equal(queue.q4, 'duplicate of ' + queue.q3.slice('added as '.length))
const keys = context.read('Leads').map((l) => String(l.phone).replace(/\D/g, '').slice(-10))
assert.equal(new Set(keys).size, keys.length)
assert.equal(context.read('Events').filter((e) => e.event === 'repeat').length, 3)
const walkIn = context.read('Leads').find((l) => l.phone === '9000000001')
context.save('Leads', context.read('Leads').filter((l) => l.id !== walkIn.id))

const ownerView = ok('listLeads', [{}], owner)
assert.ok(Date.parse(ownerView.syncedAt) > 0)
assert.equal(ownerView.leads.length, 2)
assert.deepEqual(ownerView.leads.map((l) => l.source).sort(), ['Facebook', 'Instagram'])
assert.deepEqual(ownerView.leads.map((l) => l.sourceName), ['Plot form', 'Plot form'])
assert.deepEqual(ownerView.leads.map((l) => l.campaign).sort(), ['Diwali Offer', 'Reels'])
const campaigns = ok('listCampaigns', [], owner)
assert.equal(campaigns.length, 2)

const emp = 'tok-emp'
assert.equal(ok('listLeads', [{}], emp).leads.length, 2)
fails('writeProject', [{ action: 'addProject', name: 'Nope' }], emp, /Only the owner/)

const leadId = ownerView.leads[0].id
ok('writeLead', [{ action: 'assign', leadIds: [leadId], toUserIds: [empId] }], owner)
const mine = ok('listLeads', [{}], emp).leads.find((l) => l.id === leadId)
assert.equal(mine.view, 'mine')
assert.equal(mine.canEdit, true)

fails('writeLead', [{ action: 'update', leadId, changes: { status: 'lost' } }], emp, /lost/)
ok('writeLead', [{ action: 'update', leadId, changes: { priority: 'high' }, reason: 'Ready to book' }], emp)
ok('writeLead', [{ action: 'update', leadId, changes: { status: 'lost', lostReason: 'Price too high', notes: 'Called twice' } }], emp)
const updated = ok('listLeads', [{}], owner).leads.find((l) => l.id === leadId)
assert.equal(updated.status, 'lost')
const priorityChange = updated.activity.find((a) => a.field === 'priority')
assert.equal(priorityChange.to, 'high')
assert.equal(priorityChange.reason, 'Ready to book')
assert.ok(updated.activity.some((a) => a.event === 'created'))
assert.equal(context.read('Events').filter((e) => e.leadId === leadId && e.event === 'updated').length, 4)
fails('writeLead', [{ action: 'assign', leadIds: [leadId], toUserIds: [empId] }], owner, /Closed leads/)

const other = ownerView.leads[1].id
ok('writeLead', [{ action: 'assign', leadIds: [other], toUserIds: [empId] }], owner)
fails('writeLead', [{ action: 'update', leadId: other, changes: { status: 'closed' } }], emp, /deal amount/)
fails('writeLead', [{ action: 'update', leadId: other, changes: { status: 'closed', amount: '-5' } }], emp, /valid deal amount/)
ok('writeLead', [{ action: 'update', leadId: other, changes: { status: 'closed', amount: '₹1,50,000' } }], emp)
const perf = ok('performance', [], emp)
assert.equal(perf.mine.length, 1)
assert.equal(perf.mine[0].amount, 150000)
assert.ok(perf.mine[0].closedAt)
assert.deepEqual(perf.board.map((row) => Object.keys(row).sort()), [['amount', 'name', 'you'], ['amount', 'name', 'you']])
assert.deepEqual(perf.board[0], { name: 'Emp One', amount: 150000, you: true })
assert.equal(ok('performance', [], owner).board.find((row) => row.you).amount, 0)

const before = context.read('Leads').find((l) => l.id === other).touchedAt
ok('logCall', [other], emp)
assert.notEqual(context.read('Leads').find((l) => l.id === other).touchedAt, before)
ok('logCall', [leadId], owner)
fails('logCall', ['nope'], emp, /no longer exists/)
const empCalls = ok('callStats', [], emp)
assert.deepEqual(empCalls.calls.map((c) => [c.leadId, c.userId, c.project]), [[other, empId, null]])
assert.deepEqual(empCalls.people, [])
const allCalls = ok('callStats', [], owner)
assert.equal(allCalls.calls.length, 2)
assert.equal(allCalls.people.length, 2)
assert.ok(ok('listLeads', [{}], owner).leads.find((l) => l.id === other).activity.some((a) => a.event === 'call' && a.byName === 'Emp One'))

context.save('Campaigns', context.read('Campaigns').map((c) => ({ ...c, stopped: c.name === 'Diwali Offer' })))
metaPages = [{ data: [metaLead('m4', '+917000000001', 'Diwali Offer'), metaLead('m5', '+917000000002', 'Reels', 'ig')] }]
assert.equal(context.syncMetaLeads(), 1)
props.META_FORM_IDS = ''
metaPages = [{ data: [] }, { data: [metaLead('m6', '+917000000003', 'Reels', 'ig')] }, { data: [metaLead('m7', '+917000000004', 'Old')] }]
assert.equal(context.syncMetaLeads(), 1)
assert.equal(metaPages.length, 1)
props.META_AD_ACCOUNT = '123'
props.META_ADS_TOKEN = 'ads'
metaPages = [{ data: [metaLead('m8', '+917000000005', 'Reels', 'ig'), metaLead('m9', '+917000000006', 'Old Ad')] }]
assert.equal(context.syncMetaLeads(), 1)
assert.equal(context.read('Leads').some((l) => l.metaId === 'm9'), false)
delete props.META_AD_ACCOUNT
delete props.META_ADS_TOKEN
assert.equal(context.read('Leads').find((l) => l.metaId === 'm6').sourceName, 'Villa form')

const imported = ok('importLeads', [[{ name: 'Excel Person', phone: 9123456780 }, { name: 'Again', phone: '+91 98765 43210' }, { name: 'No Phone', phone: null }], 'expo.xlsx'], emp)
assert.deepEqual({ ...imported }, { added: 1, repeats: 1, rejected: 1 })
const excelLead = context.read('Leads').find((l) => l.name === 'Excel Person')
assert.equal(excelLead.source, 'Emp One')
assert.equal(excelLead.sourceName, 'expo.xlsx')
assert.equal(context.read('Events').find((e) => e.leadId === excelLead.id).byName, 'Emp One')
fails('importLeads', [[], 'x.xlsx'], emp, /no leads/)
ok('updateUser', [{ id: empId, active: false }], owner)
assert.equal(ok('currentSession', [], emp), null)
fails('listLeads', [{}], emp, /expired/)

const flagCells = ['Users', 'Projects', 'Campaigns', 'Sources'].flatMap((name) => {
  const [header, ...rows] = sheets[name].getDataRange().getValues()
  const flags = header.flatMap((column, i) => (['active', 'stopped', 'connected'].includes(column) ? [i] : []))
  return rows.flatMap((row) => flags.map((i) => row[i]))
})
assert.ok(flagCells.length > 0 && flagCells.every((v) => v === 'TRUE' || v === 'FALSE'), `flags must be TRUE/FALSE, got ${[...new Set(flagCells)]}`)

console.log('backend ok')

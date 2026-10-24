// Run with: npm run check
import assert from 'node:assert/strict'

import { call, demoUsers, setCurrentUser } from './backend.ts'

type Lead = { id: string; status: string; view: string; canEdit: boolean; isTerminal: boolean; assignees: { id: string }[] }
type Leads = { leads: Lead[] }

const owner = demoUsers().find((u) => u.role === 'owner')!
const emp = demoUsers().find((u) => u.role === 'employee')!

setCurrentUser(null)
assert.equal(await call('currentSession'), null)
await assert.rejects(call('listLeads', {}), /expired/)

setCurrentUser(owner.id)
const all = (await call<Leads>('listLeads', {})).leads
assert.ok(all.length > 0)
const open = all.find((l) => !l.isTerminal)!
await call('writeLead', { action: 'assign', leadIds: [open.id], toUserIds: [emp.id] })

setCurrentUser(emp.id)
await assert.rejects(call('writeProject', { action: 'addProject', name: 'Nope' }), /Only the owner/)
const mine = (await call<Leads>('listLeads', {})).leads.find((l) => l.id === open.id)!
assert.equal(mine.view, 'mine')
assert.equal(mine.canEdit, true)
await assert.rejects(call('writeLead', { action: 'update', leadId: open.id, changes: { status: 'lost' } }), /lost/)
await assert.rejects(call('writeLead', { action: 'update', leadId: open.id, changes: { status: 'closed', amount: '-5' } }), /valid deal amount/)
await call('writeLead', { action: 'update', leadId: open.id, changes: { status: 'closed', amount: '₹1,50,000' } })
const perf = await call<{ mine: { leadId: string; amount: number }[] }>('performance')
assert.equal(perf.mine.find((d) => d.leadId === open.id)?.amount, 150000)

setCurrentUser(owner.id)
await assert.rejects(call('writeLead', { action: 'assign', leadIds: [open.id], toUserIds: [owner.id] }), /Closed leads/)
await call('updateUser', { id: emp.id, active: false })
setCurrentUser(emp.id)
assert.equal(await call('currentSession'), null)

console.log('backend ok')

import type { Lead, LeadsQuery, Performance, LeadsResponse, LeadWriteInput, LeadWriteResponse, RosterMember } from '@logic/leads/leadTypes'
import { handoverPlan } from '@logic/rules/transfer'
import { call } from '@shared/lib/backend'

export const fetchLeads = (query: LeadsQuery) => call<LeadsResponse>('listLeads', query)

export const fetchPerformance = () => call<Performance>('performance')

export const writeLead = (input: LeadWriteInput) => call<LeadWriteResponse>('writeLead', input)

export async function shareLeads(groups: { userId: string; leadIds: string[] }[]): Promise<number> {
  for (const group of groups) {
    await writeLead({ action: 'assign', leadIds: group.leadIds, toUserIds: [group.userId] })
  }
  return groups.length
}

export async function assignLeads(
  leads: Lead[],
  people: RosterMember[]
): Promise<{ done: number; refused: string[] }> {
  const names = new Map(leads.map((lead) => [lead.id, lead.name]))
  try {
    const { results = [] } = await writeLead({
      action: 'assign',
      leadIds: leads.map((lead) => lead.id),
      toUserIds: people.map((person) => person.id)
    })
    if (results.length === 0) return { done: leads.length, refused: [] }
    return {
      done: results.filter((entry) => entry.ok && !entry.noop).length,
      refused: results
        .filter((entry) => !entry.ok || entry.noop)
        .map((entry) => `${names.get(entry.leadId) ?? entry.leadId}: ${entry.error ?? 'Nothing changed.'}`)
    }
  } catch (error) {
    return { done: 0, refused: leads.map((lead) => `${lead.name}: ${(error as Error).message}`) }
  }
}

export async function moveLeads(fromUserId: string, toUserId: string, keepFrom = false): Promise<number> {
  const { leads } = await fetchLeads({})
  let moved = 0
  for (const group of handoverPlan(leads, fromUserId, toUserId, keepFrom)) {
    await writeLead({ action: 'assign', leadIds: group.leadIds, toUserIds: group.toUserIds })
    moved += group.leadIds.length
  }
  return moved
}

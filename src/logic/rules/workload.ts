import type { LeadAssignee } from './transfer.ts'

export function leadsPerAssignee<T extends { assignees: LeadAssignee[] }>(
  leads: T[]
): Array<{ assigneeId: string; assigneeName: string; leads: T[] }> {
  const groups = new Map<string, { assigneeName: string; leads: T[] }>()

  for (const lead of leads) {
    for (const person of lead.assignees) {
      const key = person.id ?? person.name.trim()
      if (!key) continue
      const group = groups.get(key)
      if (group) group.leads.push(lead)
      else groups.set(key, { assigneeName: person.name || 'Unknown', leads: [lead] })
    }
  }

  return [...groups.entries()]
    .map(([assigneeId, group]) => ({ assigneeId, ...group }))
    .sort((a, b) => b.leads.length - a.leads.length || a.assigneeName.localeCompare(b.assigneeName))
}

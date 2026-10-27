import { isTerminalStatus } from './statuses.ts'

export type LeadAssignee = { id: string | null; name: string }

type AssignCheck = { ok: true } | { ok: false; reason: string }

export function assigneeNames(assignees: LeadAssignee[]): string {
  return assignees.map((person) => person.name).join(', ')
}

export function canAssign(params: {
  status: string
  assignees: LeadAssignee[]
  toUserIds: string[]
}): AssignCheck {
  if (params.toUserIds.length === 0) {
    return { ok: false, reason: 'Pick at least one person to handle this lead.' }
  }
  if (isTerminalStatus(params.status)) {
    return { ok: false, reason: 'Closed leads cannot be reassigned.' }
  }
  const current = params.assignees.map((person) => person.id).filter(Boolean)
  const same =
    current.length === params.toUserIds.length &&
    params.toUserIds.every((id) => current.includes(id))
  if (same) return { ok: false, reason: 'Those are already the people on this lead.' }

  return { ok: true }
}

type HandoverGroup = { leadIds: string[]; toUserIds: string[] }

const BATCH = 200

export function handoverPlan(
  leads: { id: string; status: string; assignees: LeadAssignee[] }[],
  fromUserId: string,
  toUserId: string,
  keepFrom = false
): HandoverGroup[] {
  const groups = new Map<string, HandoverGroup>()

  for (const lead of leads) {
    if (isTerminalStatus(lead.status)) continue
    if (!lead.assignees.some((person) => person.id === fromUserId)) continue

    const current = lead.assignees
      .map((person) => person.id)
      .filter((id): id is string => id !== null)

    const kept = current.filter((id) => id !== toUserId && (keepFrom || id !== fromUserId))
    const toUserIds = [...kept, toUserId]

    const unchanged =
      current.length === toUserIds.length && toUserIds.every((id) => current.includes(id))
    if (unchanged) continue

    const key = [...toUserIds].sort().join(',')
    const group = groups.get(key)
    if (group) group.leadIds.push(lead.id)
    else groups.set(key, { leadIds: [lead.id], toUserIds })
  }

  const batched: HandoverGroup[] = []
  for (const group of groups.values()) {
    for (let i = 0; i < group.leadIds.length; i += BATCH) {
      batched.push({ toUserIds: group.toUserIds, leadIds: group.leadIds.slice(i, i + BATCH) })
    }
  }
  return batched
}

export function splitByCounts(
  leadIds: string[],
  counts: { userId: string; count: number }[]
): { userId: string; leadIds: string[] }[] {
  let start = 0
  const groups = counts.map(({ userId, count }) => {
    const end = start + Math.max(0, count)
    const group = { userId, leadIds: leadIds.slice(start, end) }
    start = end
    return group
  })
  return groups.filter((group) => group.leadIds.length > 0)
}

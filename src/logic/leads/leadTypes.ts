import type { LeadAssignee } from '@logic/rules/transfer'

export type { LeadAssignee }

export type LeadStatus = string

export type LeadHandover = {
  at: string | null
  assigneeId: string | null
  assigneeName: string | null
  byName: string | null
  reason: string | null
}

export type LeadActivity = {
  at: string
  event: string
  field: string | null
  from: string | null
  to: string | null
  byName: string | null
  reason: string | null
}

export type Lead = {
  id: string
  name: string
  phone: string | null
  source: string | null
  sourceName: string | null
  campaign?: string | null
  project: string | null
  possession: string | null
  status: LeadStatus
  isTerminal: boolean
  view: LeadsView
  canEdit: boolean
  canAssign: boolean
  priority: string | null
  nextFollowUpAt: string | null
  assignees: LeadAssignee[]
  lostReason: string | null
  notes: string | null
  amount?: number | null
  untouchedDays: number | null
  history: LeadHandover[]
  activity?: LeadActivity[]
  createdAt: string | null
  updatedAt: string | null
}

export type ClosedDeal = {
  leadId: string
  name: string
  closedAt: string
  amount: number
}

export type Performance = {
  mine: ClosedDeal[]
  board: { name: string; amount: number; you: boolean }[]
}

export type CallLog = {
  at: string
  leadId: string
  leadName: string
  leadPhone?: string | null
  project: string | null
  campaign: string | null
  userId: string | null
  userName: string | null
}

export type CallStats = {
  calls: CallLog[]
  people: { id: string; name: string }[]
}

export type RosterMember = {
  id: string
  name: string
  role: 'owner' | 'employee' | string
  projects: number
}

export type LeadsResponse = {
  leads: Lead[]
  roster: RosterMember[]
  months: string[]
  syncedAt: string | null
}

export type LeadsView = 'mine' | 'unassigned' | 'others' | 'all'

export type LeadsQuery = {
  month?: string
  from?: string
  to?: string
}

export type LeadFilters = {
  project?: string
  priority?: string
  repeated?: string
  source?: string
  campaign?: string
  timing?: string
  search?: string
}

type LeadWriteAction = 'update' | 'assign'

export type LeadWriteInput = {
  action: LeadWriteAction
  leadId?: string
  leadIds?: string[]
  reason?: string
  toUserIds?: string[]
  changes?: Partial<{
    name: string
    source: string
    sourceName: string
    project: string
    possession: string
    status: LeadStatus
    priority: 'high' | 'medium' | 'low'
    nextFollowUpAt: string | null
    notes: string
    lostReason: string
    amount: number | null
  }>
}

type LeadWriteResult = {
  leadId: string
  ok: boolean
  noop?: boolean
  error?: string
}

export type LeadWriteResponse = {
  noop?: boolean
  results?: LeadWriteResult[]
}

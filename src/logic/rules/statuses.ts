export const LEAD_STATUSES = [
  'new',
  'call_after_some_time',
  'call_back_later',
  'interested',
  'invalid_number',
  'lost',
  'not_answered',
  'not_interested',
  'not_reachable',
  'reg_done',
  'sent_details',
  'switched_off',
  'closed'
] as const

type LeadStatus = (typeof LEAD_STATUSES)[number]

const labels: Record<LeadStatus, string> = {
  new: 'New',
  call_after_some_time: 'Call after some time',
  call_back_later: 'Call back later',
  interested: 'Interested',
  invalid_number: 'Invalid Number',
  lost: 'Lost',
  not_answered: 'Not Answered',
  not_interested: 'Not Interested',
  not_reachable: 'Not Reachable',
  reg_done: 'Reg Done',
  sent_details: 'Sent Details',
  switched_off: 'Switched Off',
  closed: 'Closed'
}

export function statusLabel(status: string): string {
  return labels[status as LeadStatus] ?? status
}

export function isTerminalStatus(status: string): boolean {
  return status === 'closed' || status === 'lost'
}

export const LOST_REASONS = [
  'Price too high',
  'Location did not suit',
  'Loan not approved',
  'Bought elsewhere',
  'Not responding',
  'Not a serious buyer',
  'Other'
] as const

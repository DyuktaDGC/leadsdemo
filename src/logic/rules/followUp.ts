export const LEAD_TIMINGS = ['latest', 'upcoming', 'overdue'] as const

type LeadTiming = (typeof LEAD_TIMINGS)[number]

const labels: Record<LeadTiming, string> = {
  latest: 'Latest leads',
  upcoming: 'Upcoming follow ups',
  overdue: 'Overdue follow ups'
}

export function timingLabel(timing: string): string {
  return labels[timing as LeadTiming] ?? timing
}

const RECENT_DAYS = 7

export function matchesTiming(
  lead: { createdAt: string | null; nextFollowUpAt: string | null },
  timing: string | undefined,
  now: number = Date.now()
): boolean {
  switch (timing) {
    case 'latest':
      return lead.createdAt !== null && Date.parse(lead.createdAt) >= now - RECENT_DAYS * 86_400_000
    case 'upcoming':
      return lead.nextFollowUpAt != null && Date.parse(lead.nextFollowUpAt) >= now
    case 'overdue':
      return lead.nextFollowUpAt != null && Date.parse(lead.nextFollowUpAt) < now
    default:
      return true
  }
}

export function sortByTiming<T extends { createdAt: string | null; nextFollowUpAt: string | null }>(
  leads: T[],
  timing: string | undefined
): T[] {
  if (timing === 'latest') {
    return [...leads].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
  }
  if (timing === 'upcoming' || timing === 'overdue') {
    return [...leads].sort(
      (a, b) => Date.parse(a.nextFollowUpAt ?? '') - Date.parse(b.nextFollowUpAt ?? '')
    )
  }
  return leads
}

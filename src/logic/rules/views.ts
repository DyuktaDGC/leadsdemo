import { matchesTiming, sortByTiming } from './followUp.ts'
import { matchesRequirements, type RequirementFilters } from './requirements.ts'

type View = 'mine' | 'unassigned' | 'others' | 'all'

function matchesSearch(
  lead: { name: string; phone: string | null; project: string | null },
  search: string | undefined
): boolean {
  const needle = (search ?? '').trim().toLowerCase()
  if (!needle) return true
  return [lead.name, lead.phone, lead.project].some((field) =>
    (field ?? '').toLowerCase().includes(needle)
  )
}

type SelectableLead = {
  view: View
  project: string | null
  name: string
  phone: string | null
  priority: string | null
  source?: string | null
  campaign?: string | null
  createdAt: string | null
  nextFollowUpAt: string | null
  activity?: { event: string }[]
}

type LeadSelection = RequirementFilters & {
  repeated?: string
  priority?: string
  source?: string
  campaign?: string
  timing?: string
  search?: string
}

export function selectLeads<T extends SelectableLead>(
  leads: T[],
  view: View,
  filters: LeadSelection,
  now: number = Date.now()
): T[] {
  const matched = leads.filter(
    (lead) =>
      (view === 'all' || lead.view === view) &&
      matchesRequirements(lead, filters) &&
      (!filters.repeated ||
        (filters.repeated === 'yes') ===
          !!lead.activity?.some((entry) => entry.event === 'repeat')) &&
      (!filters.priority || lead.priority === filters.priority) &&
      (!filters.source || lead.source === filters.source) &&
      (!filters.campaign || lead.campaign === filters.campaign) &&
      matchesTiming(lead, filters.timing, now) &&
      matchesSearch(lead, filters.search)
  )

  return sortByTiming(matched, filters.timing)
}

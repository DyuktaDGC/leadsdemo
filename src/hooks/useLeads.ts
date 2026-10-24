import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchLeads } from '@logic/leads/leadsApi'
import type { LeadFilters, LeadsQuery, LeadsView } from '@logic/leads/leadTypes'
import { selectLeads } from '@logic/rules/views'
import { queryKeys } from '@shared/lib/queryKeys'

const NO_FILTERS: LeadFilters = {}

export function useLeads(
  view: LeadsView,
  filters: LeadFilters = NO_FILTERS,
  query: LeadsQuery = {}
) {
  const result = useQuery({
    queryKey: queryKeys.leads.list(query),
    queryFn: () => fetchLeads(query),
    refetchInterval: 2 * 60_000
  })

  const all = result.data?.leads
  const leads = useMemo(() => selectLeads(all ?? [], view, filters), [all, view, filters])

  return {
    ...result,
    leads,
    roster: result.data?.roster ?? [],
    months: result.data?.months ?? []
  }
}

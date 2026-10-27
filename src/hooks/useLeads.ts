import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchLeads } from '@logic/leads/leadsApi'
import type { LeadFilters, LeadsQuery, LeadsResponse, LeadsView } from '@logic/leads/leadTypes'
import { selectLeads } from '@logic/rules/views'
import { queryKeys } from '@shared/lib/queryKeys'
import { readCachedLeads, writeCachedLeads } from '@shared/lib/sessionCache'

const NO_FILTERS: LeadFilters = {}

export function useLeads(
  view: LeadsView,
  filters: LeadFilters = NO_FILTERS,
  query: LeadsQuery = {}
) {
  const result = useQuery({
    queryKey: queryKeys.leads.list(query),
    queryFn: async () => {
      const data = await fetchLeads(query)
      writeCachedLeads(query, data)
      return data
    },
    initialData: () => readCachedLeads<LeadsResponse>(query),
    initialDataUpdatedAt: 0,
    refetchInterval: 2 * 60_000
  })

  const all = result.data?.leads
  const leads = useMemo(() => selectLeads(all ?? [], view, filters), [all, view, filters])

  return {
    ...result,
    leads,
    roster: result.data?.roster ?? [],
    months: result.data?.months ?? [],
    syncedAt: result.data?.syncedAt ?? null
  }
}

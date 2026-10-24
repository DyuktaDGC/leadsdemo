import { useQuery } from '@tanstack/react-query'

import { fetchPerformance } from '@logic/leads/leadsApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function usePerformance() {
  return useQuery({ queryKey: queryKeys.leads.performance, queryFn: fetchPerformance })
}

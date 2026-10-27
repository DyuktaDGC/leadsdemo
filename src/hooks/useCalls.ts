import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCallStats, logCall } from '@logic/leads/leadsApi'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useCallStats() {
  return useQuery({ queryKey: queryKeys.leads.calls, queryFn: fetchCallStats })
}

export function useLogCall() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logCall,
    onError: (error) => toast(error.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
  })
}

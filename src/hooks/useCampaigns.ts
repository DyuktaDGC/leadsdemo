import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCampaigns, fetchSources, setMetaConnected } from '@logic/campaigns/campaignsApi'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns.list(), queryFn: fetchCampaigns })
}

export function useSources() {
  return useQuery({ queryKey: queryKeys.campaigns.sources(), queryFn: fetchSources })
}

export function useMetaConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setMetaConnected,
    onSuccess: (_result, on) => {
      toast(on ? 'Meta connected' : 'Meta disconnected')
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.sources() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.list() })
      ])
    },
    onError: (error) => toast(error.message, 'error')
  })
}

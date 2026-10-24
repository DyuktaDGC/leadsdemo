import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCampaigns, setCampaignStopped } from '@logic/campaigns/campaignsApi'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns.list(), queryFn: fetchCampaigns })
}

export function useStopCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stopped }: { id: string; stopped: boolean }) => setCampaignStopped(id, stopped),
    onSuccess: (_result, { stopped }) => {
      toast(stopped ? 'Campaign set to inactive' : 'Campaign set to active')
      return queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.list() })
    },
    onError: (error) => toast(error.message, 'error')
  })
}

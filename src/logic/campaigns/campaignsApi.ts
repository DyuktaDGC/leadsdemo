import type { Campaign } from '@logic/campaigns/campaignTypes'
import { call } from '@shared/lib/backend'

export const fetchCampaigns = () => call<Campaign[]>('listCampaigns')

export const setCampaignStopped = (id: string, stopped: boolean) => call<void>('setCampaignStopped', id, stopped)

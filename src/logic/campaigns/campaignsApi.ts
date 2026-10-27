import type { Campaign, SourceConnection } from '@logic/campaigns/campaignTypes'
import { call } from '@shared/lib/backend'

export const fetchCampaigns = () => call<Campaign[]>('listCampaigns')

export const fetchSources = () => call<SourceConnection[]>('listSources')

export const setMetaConnected = (on: boolean) => call<void>('setMetaConnected', on)

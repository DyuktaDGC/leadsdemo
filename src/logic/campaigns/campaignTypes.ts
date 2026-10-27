export type Campaign = {
  id: string
  name: string
  platform: string
  sourceId: string
  stopped?: boolean
  start: string
  leads: number
}

export type SourceConnection = {
  id: string
  connected: boolean
  error?: string | null
}

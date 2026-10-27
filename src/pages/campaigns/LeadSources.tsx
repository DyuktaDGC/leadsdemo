import { CheckCircle2, Plug, Unplug } from 'lucide-react'

import { useMetaConnection } from '@hooks/useCampaigns'
import type { Campaign } from '@logic/campaigns/campaignTypes'
import { pluralize } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'

export function LeadSources({
  connected,
  checking,
  error,
  campaigns
}: {
  connected: boolean
  checking: boolean
  error: string | null
  campaigns: Campaign[]
}) {
  const connection = useMetaConnection()
  const leads = campaigns.filter((c) => c.sourceId === 'meta').reduce((sum, c) => sum + c.leads, 0)

  const toggle = () => {
    if (connected && !window.confirm('Disconnect Meta? New leads stop coming in until you connect again.')) return
    connection.mutate(!connected)
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0866FF] text-lg font-bold text-white">
        M
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Meta Business Suite</p>
        <p className="text-xs text-slate-500">Facebook, Instagram and WhatsApp</p>
        {checking ? (
          <p className="mt-1 text-xs text-slate-400">Checking connection…</p>
        ) : error ? (
          <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
        ) : connected ? (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected · {pluralize(leads, 'lead')}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Not connected</p>
        )}
      </div>
      <Button
        className="w-full sm:w-auto"
        size="sm"
        variant={connected ? 'ghostDanger' : 'primary'}
        disabled={checking || connection.isPending}
        onClick={toggle}
      >
        {connected ? <Unplug className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
        {connection.isPending ? 'Working…' : connected ? 'Disconnect' : 'Connect Meta'}
      </Button>
    </section>
  )
}

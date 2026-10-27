import { Megaphone, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCampaigns, useSources } from '@hooks/useCampaigns'
import type { Campaign } from '@logic/campaigns/campaignTypes'
import { CampaignQuality } from '@pages/campaigns/CampaignQuality'
import { LeadSources } from '@pages/campaigns/LeadSources'
import { formatDate } from '@shared/lib/date'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Filter = 'all' | 'active' | 'inactive'

export function CampaignsPage() {
  const campaigns = useCampaigns()
  const sources = useSources()
  const [filter, setFilter] = useState<Filter>('all')

  const all = useMemo(() => campaigns.data ?? [], [campaigns.data])
  const rows = useMemo(
    () => (filter === 'all' ? all : all.filter((c) => !c.stopped === (filter === 'active'))),
    [all, filter]
  )

  const leads = rows.reduce((sum, c) => sum + c.leads, 0)
  const loading = campaigns.isPending
  const meta = sources.data?.find((row) => row.id === 'meta')
  const connected = Boolean(meta?.connected)

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{c.name}</p>
          <p className="text-xs text-slate-500">{c.platform}</p>
        </div>
      )
    },
    { key: 'leads', header: 'Leads', cell: (c) => <span className="font-semibold tabular-nums">{c.leads}</span> },
    {
      key: 'since',
      header: 'Since',
      cell: (c) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(c.start)}</span>
    }
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Campaigns</h1>
      </header>

      <LeadSources
        connected={connected}
        checking={sources.isPending}
        error={sources.error?.message ?? meta?.error ?? null}
        campaigns={all}
      />

      <h2 className="pt-2 text-lg font-bold text-ink">Campaigns</h2>

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]}
      />

      {campaigns.isError && <p className="text-sm text-red-600">{campaigns.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <StatTile label="Leads from ads" value={leads} loading={loading} tone="indigo" icon={Users} />
        <StatTile
          label="Active campaigns"
          value={rows.filter((c) => !c.stopped).length}
          loading={loading}
          tone="emerald"
          icon={Megaphone}
        />
      </div>

      <Table columns={columns} rows={rows} rowKey={(c) => c.id} isLoading={loading} pageSize={10} emptyMessage="No campaigns here." />

      <CampaignQuality />
    </div>
  )
}

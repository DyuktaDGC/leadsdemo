import { Megaphone, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCampaigns, useStopCampaign } from '@hooks/useCampaigns'
import type { Campaign } from '@logic/campaigns/campaignTypes'
import { cn } from '@shared/lib/cn'
import { formatDate } from '@shared/lib/date'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Filter = 'all' | 'active' | 'inactive'

export function CampaignsPage() {
  const campaigns = useCampaigns()
  const stop = useStopCampaign()
  const [filter, setFilter] = useState<Filter>('all')

  const all = useMemo(() => campaigns.data ?? [], [campaigns.data])
  const rows = useMemo(
    () => (filter === 'all' ? all : all.filter((c) => !c.stopped === (filter === 'active'))),
    [all, filter]
  )

  const leads = rows.reduce((sum, c) => sum + c.leads, 0)
  const loading = campaigns.isPending

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
    },
    {
      key: 'toggle',
      header: <span className="block text-right">Status</span>,
      cell: (c) => {
        const on = !c.stopped
        return (
          <label className="flex cursor-pointer items-center justify-end gap-2 text-xs font-semibold">
            <span className={on ? 'text-emerald-600' : 'text-slate-400'}>{on ? 'Active' : 'Inactive'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={`Leads from ${c.name}`}
              disabled={stop.isPending && stop.variables?.id === c.id}
              onClick={() => stop.mutate({ id: c.id, stopped: on })}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                on ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 rounded-full !bg-white shadow transition-transform duration-300 ease-out motion-reduce:transition-none',
                  on ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </label>
        )
      }
    }
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Campaigns</h1>
      </header>

      <SegmentedControl
        className="w-full max-w-full overflow-x-auto sm:w-auto"
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
    </div>
  )
}

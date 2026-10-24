import { AlarmClock, CalendarCheck, CalendarClock, Pencil } from 'lucide-react'
import { useState } from 'react'

import { useFollowUps } from '@hooks/useFollowUps'
import type { Lead } from '@logic/leads/leadTypes'
import { statusLabel } from '@logic/rules/statuses'
import { assigneeNames } from '@logic/rules/transfer'
import { EditLeadDialog } from '@pages/leads/EditLeadDialog'
import { cn } from '@shared/lib/cn'
import { daysUntil, formatDate, todayKey } from '@shared/lib/date'
import { pluralize } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { Button } from '@shared/ui/Button'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { SegmentedControl } from '@shared/ui/SegmentedControl'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

type Tab = 'overdue' | 'today' | 'upcoming'

function dueLabel(iso: string): { text: string; tone: string } {
  const days = daysUntil(iso)
  if (days < 0) return { text: `${pluralize(-days, 'day')} overdue`, tone: 'text-red-600' }
  if (days === 0) return { text: 'Today', tone: 'text-amber-600' }
  if (days === 1) return { text: 'Tomorrow', tone: 'text-brand-700' }
  return { text: `In ${pluralize(days, 'day')}`, tone: 'text-slate-500' }
}

export function FollowUpsPage() {
  const followUps = useFollowUps()
  const [picked, setTab] = useState<Tab | null>(null)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)

  const columns: Column<Lead>[] = [
    {
      key: 'lead',
      header: 'Lead',
      cell: (lead) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{lead.name}</p>
          <p className="text-xs text-slate-500">{lead.phone ?? 'N/A'}</p>
        </div>
      )
    },
    {
      key: 'due',
      header: 'Follow up',
      cell: (lead) => {
        const due = dueLabel(lead.nextFollowUpAt!)
        return (
          <div className="whitespace-nowrap">
            <p className={cn('text-sm font-semibold', due.tone)}>{due.text}</p>
            <p className="text-xs text-slate-500">{formatDate(lead.nextFollowUpAt)}</p>
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      cell: (lead) => (
        <Badge tone="neutral" size="sm">
          {statusLabel(lead.status)}
        </Badge>
      )
    },
    { key: 'project', header: 'Project', cell: (lead) => lead.project ?? 'N/A' },
    ...(followUps.owner
      ? [{ key: 'who', header: 'Assigned to', cell: (lead: Lead) => assigneeNames(lead.assignees) || 'Unassigned' }]
      : []),
    {
      key: 'notes',
      header: 'Notes',
      cell: (lead) => <p className="line-clamp-2 max-w-xs text-xs text-slate-600">{lead.notes ?? ''}</p>
    },
    {
      key: 'action',
      header: <span className="block text-right">Action</span>,
      cell: (lead) =>
        lead.canEdit ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setEditing(lead)}>
              <Pencil className="h-4 w-4" />
              Update
            </Button>
          </div>
        ) : null
    }
  ]

  const tab: Tab = picked ?? (followUps.overdue.length > 0 ? 'overdue' : 'today')
  const rows = range
    ? [...followUps.overdue, ...followUps.today, ...followUps.upcoming].filter((lead) => {
        const key = todayKey(new Date(lead.nextFollowUpAt!))
        return key >= range.from && key <= range.to
      })
    : followUps[tab]

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Follow ups</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <StatTile label="Overdue" value={followUps.overdue.length} loading={followUps.isPending} tone="rose" icon={AlarmClock} />
        <StatTile label="Due today" value={followUps.today.length} loading={followUps.isPending} tone="amber" icon={CalendarCheck} />
        <StatTile label="Upcoming" value={followUps.upcoming.length} loading={followUps.isPending} tone="indigo" icon={CalendarClock} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SegmentedControl<Tab | 'range'>
          className="w-full max-w-full overflow-x-auto sm:w-auto"
          value={range ? 'range' : tab}
          onChange={(next) => {
            setRange(null)
            if (next !== 'range') setTab(next)
          }}
          options={[
            { value: 'overdue', label: `Overdue (${followUps.overdue.length})` },
            { value: 'today', label: `Today (${followUps.today.length})` },
            { value: 'upcoming', label: `Upcoming (${followUps.upcoming.length})` }
          ]}
        />
        <DateRangePicker className="min-w-0 sm:w-48" value={range} onChange={setRange} onClear={() => setRange(null)} />
      </div>

      {followUps.error && <p className="text-sm text-red-600">{followUps.error.message}</p>}

      <Table
        columns={columns}
        rows={rows}
        rowKey={(lead) => lead.id}
        isLoading={followUps.isPending}
        pageSize={20}
        emptyMessage={range ? 'No follow ups in this range.' : tab === 'overdue' ?'Nothing overdue. Nice.' : 'No follow ups here.'}
      />

      {editing && <EditLeadDialog lead={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

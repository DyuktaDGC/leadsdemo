import { Pencil, UserPlus } from 'lucide-react'

import type { Lead } from '@logic/leads/leadTypes'
import { priorityLabel } from '@logic/rules/priority'
import { statusLabel } from '@logic/rules/statuses'
import { assigneeNames } from '@logic/rules/transfer'
import { cn } from '@shared/lib/cn'
import { formatDate } from '@shared/lib/date'
import { Badge, type BadgeTone } from '@shared/ui/Badge'
import { Table, type Column } from '@shared/ui/Table'

const priorityTones: Record<string, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral'
}

const priorityDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400'
}

const statusTones: Record<string, BadgeTone> = {
  new: 'info',
  call_after_some_time: 'warning',
  call_back_later: 'warning',
  interested: 'success',
  invalid_number: 'danger',
  lost: 'danger',
  not_answered: 'warning',
  not_interested: 'danger',
  not_reachable: 'warning',
  reg_done: 'success',
  sent_details: 'info',
  switched_off: 'warning',
  closed: 'success'
}

export function RepeatedBadge({ lead }: { lead: Lead }) {
  const times = lead.activity?.filter((entry) => entry.event === 'repeat').length ?? 0
  if (times === 0) return null
  return (
    <Badge tone="warning" size="sm">
      Repeated{times > 1 ? ` ×${times}` : ''}
    </Badge>
  )
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

const baseColumns: Column<Lead>[] = [
  {
    key: 'name',
    header: 'Lead',
    cell: (lead) => (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{lead.name}</p>
          <RepeatedBadge lead={lead} />
        </div>
        <p className="text-xs text-slate-500">{lead.phone ?? 'N/A'}</p>
      </div>
    )
  },
  {
    key: 'source',
    header: 'Source',
    className: 'whitespace-nowrap',
    cell: (lead) => (
      <div>
        <p>{lead.source ?? 'N/A'}</p>
        {(lead.campaign ?? lead.sourceName) && (
          <p className="text-xs text-slate-400">{lead.campaign ?? lead.sourceName}</p>
        )}
      </div>
    )
  },
  {
    key: 'project',
    header: 'Project',
    className: 'whitespace-nowrap',
    cell: (lead) => lead.project ?? 'N/A'
  },
  {
    key: 'priority',
    header: 'Priority',
    className: 'whitespace-nowrap',
    cell: (lead) =>
      lead.priority ? (
        <Badge tone={priorityTones[lead.priority] ?? 'neutral'}>
          <span className={cn('h-1.5 w-1.5 rounded-full', priorityDots[lead.priority] ?? 'bg-slate-400')} />
          {priorityLabel(lead.priority)}
        </Badge>
      ) : (
        'N/A'
      )
  },
  {
    key: 'status',
    header: 'Status',
    className: 'whitespace-nowrap',
    cell: (lead) => <Badge tone={statusTones[lead.status] ?? 'neutral'}>{statusLabel(lead.status)}</Badge>
  },
  {
    key: 'nextFollowUp',
    header: 'Next Follow Up',
    className: 'whitespace-nowrap',
    cell: (lead) => (
      <div>
        <p className={cn(lead.nextFollowUpAt && isOverdue(lead.nextFollowUpAt) && 'font-semibold text-red-600')}>
          {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : 'N/A'}
        </p>
        <p className="text-xs text-slate-400">updated {formatDate(lead.updatedAt)}</p>
      </div>
    )
  },
  {
    key: 'owner',
    header: 'Assigned To',
    cell: (lead) => (lead.assignees.length === 0 ? 'Unassigned' : assigneeNames(lead.assignees))
  }
]

export function LeadTable({
  leads,
  isLoading,
  selectedIds,
  onSelectionChange,
  onSelect,
  onAssign,
  onEdit
}: {
  leads: Lead[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onSelect: (lead: Lead) => void
  onAssign: (lead: Lead) => void
  onEdit: (lead: Lead) => void
}) {
  const columns: Column<Lead>[] = [
    ...baseColumns,
    {
      key: 'assign',
      header: 'Action',
      className: 'w-44 whitespace-nowrap text-right',
      cell: (lead) => (
          <div className="flex items-center justify-end gap-2">
            {lead.canEdit && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(lead)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 border border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {lead.canAssign && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onAssign(lead)
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 bg-brand-600 text-white shadow-sm hover:bg-brand-700"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {lead.assignees.length > 0 ? 'Reassign' : 'Assign'}
              </button>
            )}
          </div>
        )
    }
  ]

  return (
    <Table
      columns={columns}
      rows={leads}
      rowKey={(lead) => lead.id}
      selection={{
        selectedKeys: selectedIds,
        onChange: onSelectionChange,
        isSelectable: (lead) => lead.canAssign
      }}
      onRowClick={onSelect}
      isLoading={isLoading}
      emptyMessage="No leads in this view."
      pageSize={20}
    />
  )
}

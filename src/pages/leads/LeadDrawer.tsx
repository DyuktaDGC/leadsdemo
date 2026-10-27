import type { ReactNode } from 'react'

import type { Lead, LeadActivity, LeadHandover } from '@logic/leads/leadTypes'
import { priorityLabel } from '@logic/rules/priority'
import { statusLabel } from '@logic/rules/statuses'
import { assigneeNames } from '@logic/rules/transfer'
import { ContactButtons } from '@pages/leads/ContactButtons'
import { RepeatedBadge } from '@pages/leads/LeadTable'
import { cn } from '@shared/lib/cn'
import { formatDate, formatDateTime } from '@shared/lib/date'
import { formatMoney } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'

export function LeadDrawer({
  lead,
  canAssignLead,
  onAssign,
  onClose
}: {
  lead: Lead | null
  canAssignLead: boolean
  onAssign: (lead: Lead) => void
  onClose: () => void
}) {
  if (!lead) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name}
      footer={
        canAssignLead ? (
          <Button className="w-full" onClick={() => onAssign(lead)}>
            {lead.assignees.length > 0 ? 'Reassign lead' : 'Assign lead'}
          </Button>
        ) : undefined
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <dt className="w-24 shrink-0 text-slate-500 sm:w-28">Status</dt>
          <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-slate-800">
            {statusLabel(lead.status)}
            <RepeatedBadge lead={lead} />
            <span className="ml-auto">
              <ContactButtons lead={lead} />
            </span>
          </dd>
        </div>
        <Row label="Phone" value={<span className="whitespace-nowrap">{lead.phone ?? 'N/A'}</span>} />
        <Row label="Project" value={lead.project ?? 'N/A'} />
        <Row label="Priority" value={lead.priority ? priorityLabel(lead.priority) : 'N/A'} />
        <Row label="Follow up" value={lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : 'N/A'} />
        <Row
          label={lead.assignees.length > 1 ? 'Handled by' : 'Owner'}
          value={lead.assignees.length === 0 ? 'Unassigned' : assigneeNames(lead.assignees)}
        />
        <Row label="Source" value={lead.campaign ?? lead.source ?? 'N/A'} />
        <Row label="Created" value={formatDateTime(lead.createdAt)} />
        <Row
          label="Untouched"
          value={lead.untouchedDays === null ? 'N/A' : `${lead.untouchedDays} days`}
        />
        {lead.amount ? <Row label="Deal amount" value={formatMoney(lead.amount)} /> : null}
        {lead.status === 'lost' && <Row label="Lost because" value={lead.lostReason ?? 'N/A'} />}
        <Row label="Notes" value={lead.notes ?? 'N/A'} />
      </dl>
      <ActivityLog lead={lead} />
    </Modal>
  )
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  nextFollowUpAt: 'Follow up',
  notes: 'Note',
  lostReason: 'Lost because',
  amount: 'Deal amount',
  sourceName: 'Source name'
}

function showValue(field: string, value: string | null): string {
  if (value === null) return 'none'
  if (field === 'status') return statusLabel(value)
  if (field === 'priority') return priorityLabel(value)
  if (field === 'nextFollowUpAt') return formatDate(value)
  if (field === 'amount') return formatMoney(Number(value))
  return value
}

function describe(entry: LeadActivity): string {
  if (entry.event === 'created') return 'Lead created'
  if (entry.event === 'repeat') return 'Enquired again'
  if (entry.event === 'call') return 'Called'
  if (entry.event === 'assigned') return `Assigned to ${entry.to ?? 'nobody'}`
  const field = entry.field ?? ''
  const label = FIELD_LABELS[field] ?? field.charAt(0).toUpperCase() + field.slice(1)
  if (field === 'notes') return `${label}: ${entry.to ?? 'cleared'}`
  return `${label}: ${showValue(field, entry.from)} → ${showValue(field, entry.to)}`
}

export function ActivityLog({ lead }: { lead: Lead }) {
  const entries: LeadActivity[] =
    lead.activity ??
    [...lead.history].reverse().map((entry: LeadHandover) => ({
      at: entry.at ?? '',
      event: 'assigned',
      field: null,
      from: null,
      to: entry.assigneeName,
      byName: entry.byName,
      reason: entry.reason
    }))
  if (entries.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-ink">Activity log</h3>
      <div className="scrollbar-thin -ml-2 mt-1 max-h-80 overflow-y-auto py-3 pl-5">
        <ol className="space-y-4 pl-4.25">
          {entries.map((entry, index) => (
            <li
              key={`${entry.at}-${index}`}
              className={cn(
                'relative',
                index < entries.length - 1 &&
                  'before:absolute before:-bottom-5.5 before:-left-4.25 before:top-1.5 before:w-px before:bg-slate-200'
              )}
            >
              <span className="absolute -left-5.25 top-1.5 h-2.5 w-2.5">
                {index === 0 && (
                  <>
                    <span className="pulse-ring absolute inset-0 rounded-full bg-brand-500" />
                    <span
                      className="pulse-ring absolute inset-0 rounded-full bg-brand-500"
                      style={{ animationDelay: '0.8s' }}
                    />
                  </>
                )}
                <span
                  className={cn(
                    'absolute inset-0 rounded-full ring-2 ring-white',
                    index === 0 ? 'bg-brand-600' : 'bg-brand-200'
                  )}
                />
              </span>
              <p className="wrap-break-word text-sm font-medium text-ink">{describe(entry)}</p>
              {entry.reason && (
                <p
                  className={cn(
                    'mt-1 wrap-break-word text-sm',
                    entry.field === 'priority' || entry.field === 'status'
                      ? 'w-fit max-w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-900'
                      : 'text-slate-600'
                  )}
                >
                  “{entry.reason}”
                </p>
              )}
              <p className="text-xs text-slate-500">
                {formatDateTime(entry.at)}
                {entry.byName && ` · by ${entry.byName}`}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-24 shrink-0 text-slate-500 sm:w-28">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-slate-800">{value}</dd>
    </div>
  )
}

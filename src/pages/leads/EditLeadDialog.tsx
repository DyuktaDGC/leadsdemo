import { Loader2, StickyNote } from 'lucide-react'
import { useState } from 'react'

import { useUpdateLead } from '@hooks/useLeadMutations'
import { useActiveProjectNames } from '@hooks/useProjects'
import type { Lead, LeadWriteInput } from '@logic/leads/leadTypes'
import { LEAD_PRIORITIES, priorityLabel } from '@logic/rules/priority'
import { LEAD_STATUSES, LOST_REASONS, statusLabel } from '@logic/rules/statuses'
import { ActivityLog } from '@pages/leads/LeadDrawer'
import { RepeatedBadge } from '@pages/leads/LeadTable'
import { cn } from '@shared/lib/cn'
import { todayKey } from '@shared/lib/date'
import { formatMoney } from '@shared/lib/format'
import { Button } from '@shared/ui/Button'
import { DatePicker } from '@shared/ui/DatePicker'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { Select } from '@shared/ui/Select'

const statusOptions = LEAD_STATUSES.map((value) => ({ value, label: statusLabel(value) }))
const priorityOptions = LEAD_PRIORITIES.map((value) => ({ value, label: priorityLabel(value) }))
const lostReasonOptions = LOST_REASONS.map((value) => ({ value, label: value }))

type Changes = NonNullable<LeadWriteInput['changes']>

function toDateInput(iso: string | null): string {
  return iso ? todayKey(new Date(iso)) : ''
}

export function EditLeadDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const write = useUpdateLead()
  const projectNames = useActiveProjectNames()

  const [name, setName] = useState(lead.name ?? '')
  const [source, setSource] = useState(lead.source ?? '')
  const [project, setProject] = useState(lead.project ?? '')
  const [status, setStage] = useState(lead.status)
  const [priority, setPriority] = useState(lead.priority ?? '')
  const [followUp, setFollowUp] = useState(toDateInput(lead.nextFollowUpAt))
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [lostReason, setLostReason] = useState(lead.lostReason ?? '')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState(lead.amount ? String(lead.amount) : '')

  const projectOptions = projectNames.map((name) => ({ value: name, label: name }))

  const isLost = status === 'lost'
  const needsNote = isLost && lostReason === 'Other'
  const isClosed = status === 'closed'
  const dealAmount = Number(amount.replace(/[,\s₹]/g, ''))

  const changes: Changes = {}
  if (name.trim() !== (lead.name ?? '')) changes.name = name.trim()
  if (source.trim() !== (lead.source ?? '')) changes.source = source.trim()
  if (project.trim() !== (lead.project ?? '')) changes.project = project.trim()
  if (status !== lead.status) changes.status = status
  if (priority && priority !== lead.priority) {
    changes.priority = priority as Changes['priority']
  }
  if (followUp !== toDateInput(lead.nextFollowUpAt)) {
    changes.nextFollowUpAt = followUp ? new Date(`${followUp}T09:00:00`).toISOString() : null
  }
  if (notes.trim() !== (lead.notes ?? '')) changes.notes = notes.trim()
  if (isLost && (changes.status !== undefined || lostReason !== (lead.lostReason ?? ''))) {
    changes.lostReason = lostReason
  }
  if (isClosed && dealAmount !== (lead.amount ?? 0)) changes.amount = dealAmount

  const blocked = !name.trim() && (lead.name ?? '').trim() ? 'A lead needs a name.'
    : isLost && !lostReason ? 'Choose an option under "Lost because".'
    : needsNote && !reason.trim() ? 'Say what the other reason was.'
    : isClosed && !(dealAmount > 0) ? 'Enter the deal amount.'
    : Object.keys(changes).length === 0 ? 'Nothing has changed yet.'
    : null

  const submit = () => {
    if (blocked) return
    write.mutate(
      { action: 'update', leadId: lead.id, changes, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit lead"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={blocked !== null || write.isPending}>
            {write.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {write.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">Phone</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{lead.phone ?? 'No phone on record'}</p>
            <RepeatedBadge lead={lead} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The number identifies the lead. Everything else can be changed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Source" value={source} onChange={(event) => setSource(event.target.value)} />
          <Select
            label="Project"
            placeholder="Pick a project"
            options={projectOptions}
            value={project}
            searchable={projectOptions.length > 8}
            onChange={setProject}
          />
          <Select
            label="Priority"
            placeholder="No priority"
            options={priorityOptions}
            value={priority}
            onChange={setPriority}
          />
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 sm:col-span-2">
            <Select label="Status" options={statusOptions} value={status} onChange={setStage} />
          </div>
        </div>

        {isClosed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <Input
              label="Deal amount (₹)"
              inputMode="numeric"
              placeholder="e.g. 4500000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={dealAmount > 0 ? undefined : 'Required before you can save a closed lead.'}
            />
            {dealAmount > 0 && (
              <p className="mt-1.5 text-xs font-medium text-emerald-700">
                {formatMoney(dealAmount)}
              </p>
            )}
          </div>
        )}

        {isLost && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <Select
              label="Lost because"
              placeholder="Pick a reason"
              options={lostReasonOptions}
              value={lostReason}
              onChange={setLostReason}
              error={lostReason ? undefined : 'Required before you can save a lost lead.'}
            />
          </div>
        )}

        {(needsNote || changes.status !== undefined || changes.priority !== undefined) && (
          <div
            className={cn(
              'flex flex-col gap-1 rounded-xl border p-3',
              needsNote ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
            )}
          >
            <label htmlFor="lead-reason" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <StickyNote className={cn('h-4 w-4', needsNote ? 'text-red-600' : 'text-amber-600')} />
              {needsNote ? (
                <>
                  Reason for lost <span className="text-red-600">*</span>
                </>
              ) : (
                `Note for ${[
                  changes.priority && `priority (${priorityLabel(changes.priority)})`,
                  changes.status && `status (${statusLabel(changes.status)})`
                ]
                  .filter(Boolean)
                  .join(' and ')}`
              )}
            </label>
            <input
              id="lead-reason"
              value={reason}
              placeholder={needsNote ? undefined : 'Why did this change?'}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}

        <DatePicker label="Next follow up" value={followUp} onChange={setFollowUp} />
        <div className="flex flex-col gap-1">
          <label htmlFor="lead-notes" className="text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="lead-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="scrollbar-thin h-28 w-full resize-none overflow-y-auto break-words rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {blocked && <p className="text-sm text-slate-500">{blocked}</p>}
        {write.isError && <p className="text-sm text-red-600">{(write.error as Error).message}</p>}

        <ActivityLog lead={lead} />
      </div>
    </Modal>
  )
}

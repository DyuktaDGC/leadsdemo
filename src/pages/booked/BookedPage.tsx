import { IndianRupee, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useLeads } from '@hooks/useLeads'
import type { Lead } from '@logic/leads/leadTypes'
import { sameProject } from '@logic/rules/projects'
import { distinctValues } from '@logic/rules/requirements'
import { assigneeNames } from '@logic/rules/transfer'
import { ContactButtons } from '@pages/leads/ContactButtons'
import { RepeatedBadge } from '@pages/leads/LeadTable'
import { cn } from '@shared/lib/cn'
import { formatDate, todayKey } from '@shared/lib/date'
import { compactMoney, formatMoney } from '@shared/lib/format'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { Input } from '@shared/ui/Input'
import { SearchInput } from '@shared/ui/SearchInput'
import { Select } from '@shared/ui/Select'
import { Table, type Column } from '@shared/ui/Table'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

type Booking = { lead: Lead; closedBy: string; closedAt: string | null }
type Range = { from: string; to: string }

const columns: Column<Booking>[] = [
  {
    key: 'lead',
    header: 'Lead',
    cell: ({ lead }) => (
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{lead.name}</p>
          <RepeatedBadge lead={lead} />
        </div>
        <p className="text-xs text-slate-500">{lead.phone ?? 'N/A'}</p>
      </div>
    )
  },
  { key: 'project', header: 'Project', className: 'whitespace-nowrap', cell: ({ lead }) => lead.project ?? 'N/A' },
  { key: 'by', header: 'Closed by', className: 'whitespace-nowrap', cell: ({ closedBy }) => closedBy },
  { key: 'on', header: 'Closed on', className: 'whitespace-nowrap', cell: ({ closedAt }) => formatDate(closedAt) },
  {
    key: 'amount',
    header: <span className="block text-right">Amount</span>,
    cell: ({ lead }) => (
      <span className="block text-right font-semibold tabular-nums text-ink">
        {lead.amount ? formatMoney(lead.amount) : 'N/A'}
      </span>
    )
  },
  {
    key: 'action',
    header: <span className="block text-right">Action</span>,
    mobile: 'bare',
    cell: ({ lead }) => (
      <div className="flex justify-end">
        <ContactButtons lead={lead} />
      </div>
    )
  }
]

const thumb =
  'pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent focus:outline-none ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-brand-600'

function AmountRange({
  max,
  value,
  onChange
}: {
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
}) {
  const [low, high] = value
  const step = Math.max(1000, Math.round(max / 200 / 1000) * 1000)
  const parse = (text: string) => Number(text.replace(/[,\s₹]/g, '')) || 0

  return (
    <div className="flex flex-col gap-1">
      <div className="relative mt-1 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-100" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600"
          style={{ left: `${(low / max) * 100}%`, right: `${100 - (high / max) * 100}%` }}
        />
        <input
          type="range"
          aria-label="Minimum amount"
          min={0}
          max={max}
          step={step}
          value={low}
          onChange={(event) => onChange([Math.min(Number(event.target.value), high), high])}
          className={cn(thumb, low > max - step && 'z-10')}
        />
        <input
          type="range"
          aria-label="Maximum amount"
          min={0}
          max={max}
          step={step}
          value={high}
          onChange={(event) => onChange([low, Math.max(Number(event.target.value), low)])}
          className={thumb}
        />
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Input
          aria-label="Minimum amount"
          inputMode="numeric"
          placeholder="Min"
          value={low ? String(low) : ''}
          onChange={(event) => onChange([Math.min(parse(event.target.value), high), high])}
        />
        <Input
          aria-label="Maximum amount"
          inputMode="numeric"
          placeholder="Max"
          value={String(high)}
          onChange={(event) => onChange([low, Math.min(Math.max(parse(event.target.value), low), max)])}
        />
      </div>
    </div>
  )
}

function AmountFilter({
  max,
  value,
  onChange
}: {
  max: number
  value: [number, number] | null
  onChange: (value: [number, number] | null) => void
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()
  const [low, high] = value ?? [0, max]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition-colors',
          value ? 'border-brand-300 text-brand-700' : 'border-slate-300 text-slate-600',
          'hover:bg-slate-50 focus:border-brand-400 focus:outline-none',
          isOpen && 'border-brand-400'
        )}
      >
        <IndianRupee className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate">
          {value ? `${compactMoney(low)} to ${compactMoney(Math.min(high, max))}` : 'Any amount'}
        </span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose an amount range"
            style={{ position: 'fixed', top: position.top, left: position.left, width: Math.max(position.width, 288) }}
            className="z-[100] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <AmountRange max={max} value={[low, Math.min(high, max)]} onChange={onChange} />
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setIsOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export function BookedPage() {
  const leads = useLeads('all')
  const [search, setSearch] = useState('')
  const [project, setProject] = useState('')
  const [range, setRange] = useState<Range | null>(null)
  const [amount, setAmount] = useState<[number, number] | null>(null)

  const bookings = useMemo(
    () =>
      leads.leads
        .filter((lead) => lead.status === 'closed')
        .map((lead): Booking => {
          const closing = lead.activity?.find((entry) => entry.field === 'status' && entry.to === 'closed')
          return {
            lead,
            closedBy: closing?.byName ?? (assigneeNames(lead.assignees) || 'N/A'),
            closedAt: closing?.at ?? lead.updatedAt
          }
        })
        .sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt))),
    [leads.leads]
  )

  const top = Math.max(100000, Math.ceil(Math.max(0, ...bookings.map(({ lead }) => lead.amount ?? 0)) / 100000) * 100000)
  const [low, high] = amount ?? [0, top]
  const projects = distinctValues(bookings, ({ lead }) => lead.project).map((name) => ({ value: name, label: name }))

  const needle = search.trim().toLowerCase()
  const rows = bookings.filter(({ lead, closedBy, closedAt }) => {
    const value = lead.amount ?? 0
    const day = closedAt ? todayKey(new Date(closedAt)) : ''
    return (
      (!needle || [lead.name, lead.phone, lead.project, closedBy].some((field) => (field ?? '').toLowerCase().includes(needle))) &&
      (!project || sameProject(lead.project, project)) &&
      (!range || (day >= range.from && day <= range.to)) &&
      value >= low &&
      value <= high
    )
  })
  const activeCount = [needle, project, range, amount].filter(Boolean).length

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Booked</h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-slate-600">
            <SlidersHorizontal className="h-4 w-4" />
            <h2 className="text-lg font-bold text-ink">Filters</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {activeCount} active
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setProject('')
                setRange(null)
                setAmount(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </header>
        <div className="grid grid-cols-1 items-end gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-5">
          <SearchInput
            className="sm:col-span-2 xl:col-span-2"
            aria-label="Search booked deals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select label="Project" placeholder="All projects" options={projects} value={project} onChange={setProject} />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Closed on</span>
            <DateRangePicker className="w-full" label="Any date" value={range} onChange={setRange} onClear={() => setRange(null)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Amount</span>
            <AmountFilter max={top} value={amount} onChange={setAmount} />
          </div>
        </div>
      </section>

      {leads.isError && <p className="text-sm text-red-600">{(leads.error as Error).message}</p>}

      <Table
        columns={columns}
        rows={rows}
        rowKey={({ lead }) => lead.id}
        isLoading={leads.isPending}
        pageSize={20}
        emptyMessage={activeCount > 0 ? 'No closed deals match these filters.' : 'No closed deals yet.'}
      />
    </div>
  )
}

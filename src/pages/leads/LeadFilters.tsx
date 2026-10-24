import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

import type { LeadFilters as Filters } from '@logic/leads/leadTypes'
import { LEAD_TIMINGS, timingLabel } from '@logic/rules/followUp'
import { LEAD_PRIORITIES, priorityLabel } from '@logic/rules/priority'
import { periodOptions } from '@shared/lib/date'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { Select } from '@shared/ui/Select'

const timingOptions = LEAD_TIMINGS.map((value) => ({ value, label: timingLabel(value) }))
const priorityOptions = LEAD_PRIORITIES.map((value) => ({ value, label: priorityLabel(value) }))

type Setter = (key: keyof Filters) => (value: string) => void

type SelectProps = {
  filters: Filters
  months: string[]
  month: string
  onMonthChange: (month: string) => void
  projects: string[]
  sources: { value: string; label: string }[]
  campaigns: { value: string; label: string }[]
}

export function LeadFilters({
  filters,
  onChange,
  ...rest
}: SelectProps & { onChange: (filters: Filters) => void }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const set: Setter = (key) => (value) => onChange({ ...filters, [key]: value || undefined })

  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value
  ).length

  const selects = <FilterSelects filters={filters} set={set} {...rest} />

  const searchField = (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        className="pl-9"
        aria-label="Search leads"
        value={filters.search ?? ''}
        onChange={(event) => set('search')(event.target.value)}
      />
    </div>
  )

  return (
    <>
      <div className="flex items-center gap-2 sm:hidden">
        {searchField}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>
      <section className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-slate-600">
            <SlidersHorizontal className="h-4 w-4" />
            <h2 className="text-lg font-bold text-ink">Filters</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {activeCount} active
              </span>
            )}
          </div>

          {(activeCount > 0 || filters.search) && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </header>
        <div className="grid grid-cols-2 items-end gap-4 px-5 py-4 lg:grid-cols-4 xl:grid-cols-8">
          <div className="lg:col-span-2">{searchField}</div>
          {selects}
        </div>
      </section>

      {sheetOpen && (
        <Modal
          open
          onClose={() => setSheetOpen(false)}
          title="Filters"
          footer={
            <>
              <Button
                variant="ghostDanger"
                onClick={() => {
                  onChange({ search: filters.search })
                  setSheetOpen(false)
                }}
              >
                Clear all
              </Button>
              <Button onClick={() => setSheetOpen(false)}>Show results</Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4">{selects}</div>
        </Modal>
      )}
    </>
  )
}

function FilterSelects({
  filters,
  set,
  months,
  month,
  onMonthChange,
  projects,
  sources,
  campaigns
}: SelectProps & { set: Setter }) {
  return (
    <>
      <Select
        label="Month"
        placeholder="All months"
        options={periodOptions(months)}
        value={month}
        onChange={onMonthChange}
      />
      <Select
        label="Project"
        placeholder="All projects"
        options={projects.map((name) => ({ value: name, label: name }))}
        value={filters.project ?? ''}
        onChange={set('project')}
      />
      <Select
        label="Source"
        placeholder="All sources"
        options={sources}
        value={filters.source ?? ''}
        searchable={sources.length > 8}
        onChange={set('source')}
      />
      <Select
        label="Campaign"
        placeholder="All campaigns"
        options={campaigns}
        value={filters.campaign ?? ''}
        searchable={campaigns.length > 8}
        onChange={set('campaign')}
      />
      <Select
        label="Priority"
        placeholder="Any priority"
        options={priorityOptions}
        value={filters.priority ?? ''}
        onChange={set('priority')}
      />
      <Select
        label="Sort by"
        placeholder="Everything"
        options={timingOptions}
        value={filters.timing ?? ''}
        onChange={set('timing')}
      />
    </>
  )
}

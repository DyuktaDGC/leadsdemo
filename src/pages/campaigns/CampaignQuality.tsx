import { useMemo, useState } from 'react'

import { useLeads } from '@hooks/useLeads'
import type { Lead } from '@logic/leads/leadTypes'
import { cn } from '@shared/lib/cn'
import { niceTop } from '@shared/lib/format'
import { Skeleton } from '@shared/ui/Skeleton'

const OUTCOMES = [
  { key: 'closed', label: 'Closed', color: 'bg-[#059669]', statuses: ['closed'] },
  {
    key: 'working',
    label: 'In progress',
    color: 'bg-[#7a63f2]',
    statuses: ['interested', 'reg_done', 'sent_details', 'call_back_later', 'call_after_some_time']
  },
  { key: 'unanswered', label: 'Unanswered', color: 'bg-[#d97706]', statuses: ['not_answered', 'not_reachable', 'switched_off'] },
  { key: 'lost', label: 'Lost', color: 'bg-[#e11d48]', statuses: ['lost', 'not_interested', 'invalid_number'] },
  { key: 'new', label: 'New', color: 'bg-[#0ea5e9] dark:bg-[#0284c7]', statuses: ['new'] }
] as const

type OutcomeKey = (typeof OUTCOMES)[number]['key']
type Row = { name: string; total: number; counts: Record<OutcomeKey, number> }

const TOP = 8

const outcomeOf = (status: string): OutcomeKey =>
  OUTCOMES.find((outcome) => (outcome.statuses as readonly string[]).includes(status))?.key ?? 'working'

const empty = () => Object.fromEntries(OUTCOMES.map((outcome) => [outcome.key, 0])) as Record<OutcomeKey, number>

function group(leads: Lead[]): Row[] {
  const rows = new Map<string, Row>()
  for (const lead of leads) {
    const name = lead.campaign ?? lead.source ?? 'Unknown'
    const row = rows.get(name) ?? { name, total: 0, counts: empty() }
    row.total += 1
    row.counts[outcomeOf(lead.status)] += 1
    rows.set(name, row)
  }
  const sorted = [...rows.values()].sort((a, b) => b.total - a.total)
  if (sorted.length <= TOP + 1) return sorted
  const other: Row = { name: 'Other', total: 0, counts: empty() }
  for (const row of sorted.slice(TOP)) {
    other.total += row.total
    for (const outcome of OUTCOMES) other.counts[outcome.key] += row.counts[outcome.key]
  }
  return [...sorted.slice(0, TOP), other]
}

const percent = (part: number, total: number) => `${Math.round((part / total) * 100)}%`

function HoverCard({
  row,
  focus,
  align,
  bottom
}: {
  row: Row
  focus: OutcomeKey
  align: 'left' | 'center' | 'right'
  bottom: number
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 mb-6 w-52 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg',
        align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
      )}
      style={{ bottom: `${Math.min(bottom, 70)}%` }}
    >
      <p className="font-semibold text-ink">{row.name}</p>
      <p className="mb-2 text-slate-500">
        <span className="font-semibold tabular-nums text-ink">{row.total}</span> leads
      </p>
      <ul className="space-y-1">
        {OUTCOMES.map((outcome) => (
          <li
            key={outcome.key}
            className={cn('flex items-center gap-2', outcome.key === focus ? 'font-semibold text-ink' : 'text-slate-600')}
          >
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', outcome.color)} />
            <span className="flex-1">{outcome.label}</span>
            <span className="tabular-nums">{row.counts[outcome.key]}</span>
            <span className="w-9 text-right tabular-nums text-slate-500">{percent(row.counts[outcome.key], row.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CampaignQuality() {
  const leads = useLeads('all')
  const rows = useMemo(() => group(leads.leads), [leads.leads])
  const [hovered, setHovered] = useState<{ name: string; key: OutcomeKey } | null>(null)
  const top = niceTop(rows[0]?.total ?? 0, 2)

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-lg font-bold text-ink">Leads by campaign</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {OUTCOMES.map((outcome) => (
            <li key={outcome.key} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm', outcome.color)} />
              {outcome.label}
            </li>
          ))}
        </ul>
      </div>

      {leads.isPending ? (
        <Skeleton className="mt-5 h-64 w-full" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No leads yet.</p>
      ) : (
        <>
          <div className="mt-6 flex gap-2">
            <div className="relative h-64 w-8 shrink-0 text-right text-2xs tabular-nums text-slate-500">
              {[top, top / 2, 0].map((tick, index) => (
                <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${index * 50}%` }}>
                  {tick}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative h-64" onMouseLeave={() => setHovered(null)}>
                {[0, 50, 100].map((at) => (
                  <div key={at} className="absolute inset-x-0 border-t border-slate-200" style={{ top: `${at}%` }} />
                ))}
                <div className="relative flex h-full items-end justify-around gap-1">
                  {rows.map((row, index) => (
                    <div key={row.name} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      {hovered?.name === row.name && (
                        <HoverCard
                          row={row}
                          focus={hovered.key}
                          align={index === 0 ? 'left' : index === rows.length - 1 ? 'right' : 'center'}
                          bottom={(row.total / top) * 100}
                        />
                      )}
                      <span className="mb-1 text-2xs font-semibold tabular-nums text-slate-600">{row.total}</span>
                      <div
                        className="flex w-full max-w-8 flex-col-reverse gap-[2px] overflow-hidden rounded-t"
                        style={{ height: `${(row.total / top) * 100}%` }}
                      >
                        {OUTCOMES.filter((outcome) => row.counts[outcome.key] > 0).map((outcome) => (
                          <button
                            key={outcome.key}
                            type="button"
                            aria-label={`${row.name}: ${row.counts[outcome.key]} ${outcome.label}`}
                            className={cn(
                              'min-h-[3px] w-full transition-opacity',
                              outcome.color,
                              hovered && hovered.name !== row.name && 'opacity-40'
                            )}
                            style={{ flexGrow: row.counts[outcome.key], flexBasis: 0 }}
                            onMouseEnter={() => setHovered({ name: row.name, key: outcome.key })}
                            onFocus={() => setHovered({ name: row.name, key: outcome.key })}
                            onBlur={() => setHovered(null)}
                            onClick={() => setHovered({ name: row.name, key: outcome.key })}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex justify-around gap-1">
                {rows.map((row, index) => (
                  <p
                    key={row.name}
                    title={row.name}
                    className="min-w-0 flex-1 text-center text-2xs leading-tight text-slate-600 sm:line-clamp-2 sm:wrap-break-word"
                  >
                    <span className="sm:hidden">{index + 1}</span>
                    <span className="hidden sm:inline">{row.name}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <ol className="mt-4 space-y-1 text-xs text-slate-600 sm:hidden">
            {rows.map((row, index) => (
              <li key={row.name} className="flex gap-2">
                <span className="w-4 shrink-0 text-right tabular-nums text-slate-400">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums">{row.total}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="sr-only">
        <table>
          <caption>Leads by campaign and outcome</caption>
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Total</th>
              {OUTCOMES.map((outcome) => (
                <th key={outcome.key} scope="col">
                  {outcome.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                <td>{row.total}</td>
                {OUTCOMES.map((outcome) => (
                  <td key={outcome.key}>{row.counts[outcome.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

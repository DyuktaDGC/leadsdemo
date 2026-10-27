import { Gift, Handshake, IndianRupee } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { usePerformance } from '@hooks/usePerformance'
import type { ClosedDeal, Performance } from '@logic/leads/leadTypes'
import { cn } from '@shared/lib/cn'
import { toKey, todayKey } from '@shared/lib/date'
import { compactMoney, formatMoney, niceTop, pluralize } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { Skeleton } from '@shared/ui/Skeleton'
import { StatTile } from '@shared/ui/StatTile'
import { Table, type Column } from '@shared/ui/Table'

const INCENTIVE_RATE = 0.01
const MONTHS = 6
const MEDALS = ['🥇', '🥈', '🥉']
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'short' })

type Month = { key: string; label: string; amount: number; deals: number; total: number }

function monthly(deals: ClosedDeal[]): Month[] {
  const keyOf = (deal: ClosedDeal) => todayKey(new Date(deal.closedAt)).slice(0, 7)
  const starts = Array.from({ length: MONTHS }, (_, index) => {
    const start = new Date()
    start.setDate(1)
    start.setMonth(start.getMonth() - (MONTHS - 1 - index))
    return start
  })
  const first = toKey(starts[0]!).slice(0, 7)
  let total = deals.filter((deal) => keyOf(deal) < first).reduce((sum, deal) => sum + deal.amount, 0)
  return starts.map((start) => {
    const key = toKey(start).slice(0, 7)
    const inMonth = deals.filter((deal) => keyOf(deal) === key)
    const amount = inMonth.reduce((sum, deal) => sum + deal.amount, 0)
    total += amount
    return { key, label: monthName.format(start), amount, deals: inMonth.length, total }
  })
}

const H = 240
const PAD = { top: 28, right: 24, bottom: 28, left: 56 }

function GrowthChart({ months }: { months: Month[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [W, setWidth] = useState(600)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    setWidth(Math.max(280, element.clientWidth))
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry!.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const top = niceTop(Math.max(...months.map((month) => month.total)), 100000)
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / months.length
  const x = (index: number) => PAD.left + slot * index + slot / 2
  const y = (amount: number) => PAD.top + plotH - (amount / top) * plotH
  const base = PAD.top + plotH
  const points = months.map((month, index) => `${x(index)},${y(month.total)}`)
  const line = `M${points.join('L')}`
  const area = `${line}L${x(months.length - 1)},${base}L${x(0)},${base}Z`
  const last = months.length - 1
  const active = hovered === null ? null : months[hovered]!

  return (
    <div ref={box} className="relative">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block"
        role="img"
        aria-label={`Total amount closed by month: ${months.map((month) => `${month.label} ${formatMoney(month.total)}`).join(', ')}`}
        onMouseLeave={() => setHovered(null)}
      >
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-slate-200" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px]">
              {compactMoney(tick)}
            </text>
          </g>
        ))}
        <path d={area} className="fill-brand-600" fillOpacity={0.1} />
        <path d={line} fill="none" className="stroke-brand-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={base} className="stroke-slate-300" strokeWidth={1} />
        )}
        {months.map((month, index) => (
          <g key={month.key}>
            <circle
              cx={x(index)}
              cy={y(month.total)}
              r={hovered === index ? 6 : 4}
              className="fill-brand-600 stroke-surface"
              strokeWidth={2}
            />
            {index === last && (
              <text x={x(index)} y={y(month.total) - 12} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                {compactMoney(month.total)}
              </text>
            )}
            <text x={x(index)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
              {month.label}
            </text>
            <rect
              x={PAD.left + slot * index}
              y={PAD.top}
              width={slot}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
          </g>
        ))}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hovered!), 80), W - 80) }}
        >
          <p className="font-semibold text-ink">{active.label}</p>
          <p className="text-slate-600">Total {formatMoney(active.total)}</p>
          <p className="text-slate-500">
            +{formatMoney(active.amount)} · {pluralize(active.deals, 'deal')}
          </p>
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>Total amount closed by month</caption>
          <tbody>
            {months.map((month) => (
              <tr key={month.key}>
                <th scope="row">{month.label}</th>
                <td>{formatMoney(month.total)}</td>
                <td>{formatMoney(month.amount)} this month</td>
                <td>{pluralize(month.deals, 'deal')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type BoardRow = Performance['board'][number] & { rank: number }

const boardColumns: Column<BoardRow>[] = [
  {
    key: 'rank',
    header: '#',
    mobile: 'title',
    className: 'w-14',
    cell: (row) =>
      row.rank <= MEDALS.length && row.amount > 0 ? (
        <span className="text-2xl leading-none" role="img" aria-label={`Rank ${row.rank}`}>
          {MEDALS[row.rank - 1]}
        </span>
      ) : (
        <span className="pl-2 tabular-nums text-slate-500">{row.rank}</span>
      )
  },
  {
    key: 'name',
    header: 'Name',
    mobile: 'title',
    cell: (row) => (
      <span className={cn('flex items-center gap-2', row.you ? 'font-semibold text-ink' : 'text-slate-700')}>
        {row.name}
        {row.you && (
          <Badge tone="neutral" size="sm">
            You
          </Badge>
        )}
      </span>
    )
  },
  {
    key: 'amount',
    header: <span className="block text-right">Amount closed</span>,
    cell: (row) => <span className="block text-right font-semibold tabular-nums text-ink">{formatMoney(row.amount)}</span>
  }
]

export function PerformancePage() {
  const performance = usePerformance()
  const mine = useMemo(() => performance.data?.mine ?? [], [performance.data])
  const months = useMemo(() => monthly(mine), [mine])
  const total = mine.reduce((sum, deal) => sum + deal.amount, 0)
  const rows = performance.data?.board ?? []
  const board = rows.map((row, index) => ({ ...row, rank: index + 1 }))
  const loading = performance.isPending

  return (
    <div className="space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">My performance</h1>
      </header>

      {performance.error && <p className="text-sm text-red-600">{performance.error.message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        <StatTile label="Deals closed" value={mine.length} loading={loading} tone="indigo" icon={Handshake} />
        <StatTile label="Amount closed" value={formatMoney(total)} loading={loading} tone="emerald" icon={IndianRupee} />
        <StatTile label="Incentive" value={formatMoney(total * INCENTIVE_RATE)} loading={loading} tone="amber" icon={Gift} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">Growth</h2>
        {loading ? <Skeleton className="h-56 w-full" /> : <GrowthChart months={months} />}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Leaderboard</h2>
        <Table
          columns={boardColumns}
          rows={board}
          rowKey={(row) => `${row.rank}-${row.name}`}
          isLoading={loading}
          emptyMessage="No one has closed a deal yet."
        />
      </section>
    </div>
  )
}

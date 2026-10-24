import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { fromKey, monthGrid, toKey, todayKey } from '@shared/lib/date'
import { MonthNav, WeekdayHeader } from '@shared/ui/Calendar'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

const dayFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })

type DateRange = { from: string; to: string }

export function DateRangePicker({
  value,
  onChange,
  onClear,
  label = 'Custom',
  className
}: {
  value: DateRange | null
  onChange: (range: DateRange) => void
  onClear: () => void
  label?: string
  className?: string
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()

  const [pendingStart, setPendingStart] = useState<string | null>(null)
  const [draft, setDraft] = useState<DateRange | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [month, setMonth] = useState(() => (value ? (fromKey(value.from) ?? new Date()) : new Date()))

  const today = todayKey()

  const shown = draft ?? value
  const preview = pendingStart ? (hovered ?? pendingStart) : null
  const start = pendingStart ? (pendingStart < preview! ? pendingStart : preview!) : shown?.from
  const end = pendingStart ? (pendingStart < preview! ? preview! : pendingStart) : shown?.to

  const choose = (date: Date) => {
    const key = toKey(date)

    if (!pendingStart) {
      setPendingStart(key)
      setDraft(null)
      return
    }

    setDraft(pendingStart <= key ? { from: pendingStart, to: key } : { from: key, to: pendingStart })
    setPendingStart(null)
    setHovered(null)
  }

  const apply = () => {
    const chosen = draft ?? (pendingStart ? { from: pendingStart, to: pendingStart } : null)
    if (!chosen) return
    onChange(chosen)
    setPendingStart(null)
    setDraft(null)
    setHovered(null)
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          setPendingStart(null)
          setDraft(null)
          setMonth(value ? (fromKey(value.from) ?? new Date()) : new Date())
          setIsOpen((open) => !open)
        }}
        className={cn(
          'flex h-12 shrink-0 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition-colors sm:h-10',
          value ? 'border-brand-300 text-brand-700' : 'border-slate-300 text-slate-600',
          'hover:bg-slate-50 focus:border-brand-400 focus:outline-none',
          isOpen && 'border-brand-400',
          className
        )}
      >
        <CalendarRange className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate">
          {value
            ? value.from === value.to
              ? dayFormatter.format(fromKey(value.from)!)
              : `${dayFormatter.format(fromKey(value.from)!)} to ${dayFormatter.format(fromKey(value.to)!)}`
            : label}
        </span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date or date range"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className="z-[100] w-[19rem] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <MonthNav
              month={month}
              onShift={(by) =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() + by, 1))
              }
            />
            <div className="grid grid-cols-7 text-center" onMouseLeave={() => setHovered(null)}>
              <WeekdayHeader />

              {monthGrid(month).map((date) => {
                const key = toKey(date)
                const isStart = key === start
                const isEnd = key === end
                const inRange = start !== undefined && end !== undefined && key > start && key < end
                const isEdge = isStart || isEnd

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => choose(date)}
                    onMouseEnter={() => setHovered(key)}
                    className={cn(
                      'flex h-9 items-center justify-center text-sm transition-colors',
                      date.getMonth() === month.getMonth() ? 'text-slate-700' : 'text-slate-300',
                      inRange && 'bg-brand-50 text-brand-700',
                      isEdge && 'bg-brand-600 font-semibold text-white',
                      isStart && !isEnd && 'rounded-l-lg',
                      isEnd && !isStart && 'rounded-r-lg',
                      isStart && isEnd && 'rounded-lg',
                      !isEdge && !inRange && 'rounded-lg hover:bg-slate-100',
                      key === today && !isEdge && 'font-bold text-brand-600'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-center text-2xs font-semibold uppercase tracking-wide text-slate-400">
              {pendingStart
                ? 'Pick the end date, or Apply for this one day'
                : draft
                  ? draft.from === draft.to
                    ? 'Tap Apply to use this day'
                    : 'Tap Apply to use this range'
                  : 'Pick a date'}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPendingStart(null)
                  setDraft(null)
                  setHovered(null)
                  onClear()
                  setIsOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!draft && !pendingStart}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

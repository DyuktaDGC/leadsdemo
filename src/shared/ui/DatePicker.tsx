import { CalendarDays } from 'lucide-react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { fromKey, monthGrid, toKey, todayKey } from '@shared/lib/date'
import { MonthNav, WeekdayHeader } from '@shared/ui/Calendar'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

const buttonFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  max
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  max?: string
}) {
  const fieldId = useId()
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()

  const selected = value ? fromKey(value) : null
  const [month, setMonth] = useState(() => selected ?? new Date())
  const [draft, setDraft] = useState(value)
  const today = todayKey()

  const apply = () => {
    if (!draft) return
    onChange(draft)
    setIsOpen(false)
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <button
        id={fieldId}
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          setMonth(selected ?? new Date())
          setDraft(value)
          setIsOpen((open) => !open)
        }}
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm',
          'transition-colors hover:bg-slate-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          isOpen && 'border-brand-500 ring-2 ring-brand-100'
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-slate-900' : 'text-slate-400')}>
          {selected ? buttonFormatter.format(selected) : placeholder}
        </span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className="z-[100] w-[17.5rem] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <MonthNav
              month={month}
              onShift={(by) =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() + by, 1))
              }
            />
            <div className="grid grid-cols-7 gap-y-1 text-center">
              <WeekdayHeader />

              {monthGrid(month).map((date) => {
                const key = toKey(date)
                const isSelected = key === draft
                const isBlocked = Boolean(max) && key > max!

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => setDraft(key)}
                    className={cn(
                      'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                      isBlocked
                        ? 'cursor-not-allowed text-slate-300'
                        : date.getMonth() === month.getMonth()
                          ? 'text-slate-700'
                          : 'text-slate-400',
                      !isSelected && !isBlocked && 'hover:bg-brand-50 hover:text-brand-700',
                      key === today && !isSelected && 'font-bold text-brand-600 ring-1 ring-brand-200',
                      isSelected && 'bg-brand-600 font-semibold text-white'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Clear
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(today)
                    setMonth(new Date())
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={!draft}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

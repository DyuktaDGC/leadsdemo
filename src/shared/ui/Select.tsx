import { Check, ChevronDown, Search } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

export type SelectOption = { value: string; label: string; short?: string; icon?: ReactNode }

export function Select({
  label,
  options,
  placeholder = 'Select…',
  value,
  onChange,
  error,
  disabled,
  className,
  id,
  searchable = false
}: {
  label?: string
  options: SelectOption[]
  placeholder?: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
  id?: string
  searchable?: boolean
}) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.value === value)

  const needle = query.trim().toLowerCase()
  const shown =
    searchable && needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options

  const choose = (next: string) => {
    onChange(next)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={() => {
          setQuery('')
          setIsOpen((open) => !open)
        }}
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-left text-sm',
          'transition-colors hover:bg-slate-50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
          isOpen && 'border-brand-500 ring-2 ring-brand-100'
        )}
      >
        {selected?.icon}
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-slate-900' : 'text-slate-400')}>
          {selected ? (selected.short ?? selected.label) : placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              minWidth: position.width
            }}
            className="scrollbar-thin z-[100] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
          >
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    aria-label="Search options"
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {placeholder && !needle && (
              <button
                type="button"
                role="option"
                aria-selected={!selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose('')}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-50',
                  !selected && 'bg-brand-50 text-brand-700'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{placeholder}</span>
                {!selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )}

            {shown.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">No match.</p>
            )}

            {shown.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50',
                    isSelected && 'bg-brand-50 font-semibold text-brand-700'
                  )}
                >
                  {option.icon}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}

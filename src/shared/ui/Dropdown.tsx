import { ChevronDown, type LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'

import { cn } from '@shared/lib/cn'
import { useAnchoredPanel } from '@shared/ui/useAnchoredPanel'

type DropdownOption<T extends string> = { label: string; value: T }

export function Dropdown<T extends string>({
  icon: Icon,
  value,
  onChange,
  options,
  className,
  tone = 'default',
  active = false,
  placeholder = '',
  emptyMessage = 'Nothing to choose from'
}: {
  icon: LucideIcon
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  className?: string
  tone?: 'default' | 'brand'
  active?: boolean
  placeholder?: string
  emptyMessage?: string
}) {
  const { isOpen, setIsOpen, position, triggerRef, panelRef } = useAnchoredPanel()
  const selected = options.find((option) => option.value === value)

  return (
    <div className={cn('relative h-10', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'relative flex h-full w-full items-center rounded-xl border py-2 pl-9 pr-8 text-xs font-bold uppercase tracking-wide transition-colors focus:outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          tone === 'brand' && active && 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700',
          tone === 'brand' && !active &&
            'border-brand-300 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50',
          tone === 'default' && 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
        )}
      >
        <span
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
            tone === 'brand' ? (active ? 'text-white' : 'text-brand-500') : 'text-slate-500'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-left', !selected && 'font-medium normal-case text-slate-400')}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform',
            tone === 'brand' ? (active ? 'text-white/80' : 'text-brand-400') : 'text-slate-400',
            isOpen && 'rotate-180'
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 144)
            }}
            className="scrollbar-thin z-[100] max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
          >
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs font-medium text-slate-400">{emptyMessage}</p>
            )}
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50',
                  option.value === value && 'bg-brand-50 font-bold text-brand-700'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

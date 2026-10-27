import { useLayoutEffect, useRef } from 'react'

import { cn } from '@shared/lib/cn'

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return

    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-pressed="true"]')
      pill.style.opacity = active ? '1' : '0'
      if (!active) return
      pill.style.width = `${active.offsetWidth}px`
      pill.style.height = `${active.offsetHeight}px`
      pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`
    }

    place()
    void pill.offsetWidth
    pill.classList.add('transition-[transform,width]', 'duration-300', 'ease-out')
    const observer = new ResizeObserver(place)
    observer.observe(list)
    for (const child of Array.from(list.children)) observer.observe(child)

    return () => observer.disconnect()
  }, [value, options.length])

  return (
    <div
      ref={listRef}
      className={cn(
        'relative inline-flex w-full max-w-full rounded-xl border border-slate-200 bg-white p-1 sm:w-auto',
        className
      )}
    >
      <span
        ref={pillRef}
        aria-hidden
        className="absolute left-0 top-0 rounded-lg bg-brand-600 opacity-0 shadow-sm shadow-brand-950/30 motion-reduce:transition-none"
      />
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative h-8 flex-1 whitespace-nowrap rounded-lg px-2 text-xs font-semibold transition-colors duration-300 sm:px-4 sm:text-sm',
              active ? 'text-white' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

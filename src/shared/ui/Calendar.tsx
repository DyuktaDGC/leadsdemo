import { ChevronLeft, ChevronRight } from 'lucide-react'

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

export function MonthNav({ month, onShift }: { month: Date; onShift: (by: number) => void }) {
  return (
    <div className="flex items-center justify-between px-1 pb-2">
      <NavButton label="Previous month" icon={ChevronLeft} onClick={() => onShift(-1)} />
      <p className="text-sm font-semibold text-ink">{monthFormatter.format(month)}</p>
      <NavButton label="Next month" icon={ChevronRight} onClick={() => onShift(1)} />
    </div>
  )
}

function NavButton({
  label,
  icon: Icon,
  onClick
}: {
  label: string
  icon: typeof ChevronLeft
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function WeekdayHeader() {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
    <span key={index} className="py-1 text-2xs font-semibold uppercase text-slate-400">
      {day}
    </span>
  ))
}

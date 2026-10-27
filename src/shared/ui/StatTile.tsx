import type { LucideIcon } from 'lucide-react'

import { Skeleton } from '@shared/ui/Skeleton'

const statTones = {
  indigo: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600'
}

export function StatTile({
  label,
  value,
  loading,
  tone,
  icon: Icon
}: {
  label: string
  value: number | string | undefined
  loading: boolean
  tone: keyof typeof statTones
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${statTones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-14" />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{value ?? 'N/A'}</p>
      )}
    </div>
  )
}

import type { HTMLAttributes } from 'react'

import { cn } from '@shared/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7', className)}
      {...rest}
    />
  )
}

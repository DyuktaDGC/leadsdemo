import { cn } from '@shared/lib/cn'

export function Skeleton({
  className,
  rounded = 'rounded-lg',
  tone = 'bg-slate-200/80'
}: {
  className?: string
  rounded?: string
  tone?: string
}) {
  return <div className={cn('animate-pulse', tone, rounded, className)} />
}

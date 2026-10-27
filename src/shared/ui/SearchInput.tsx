import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

import { cn } from '@shared/lib/cn'
import { Input } from '@shared/ui/Input'

export function SearchInput({
  className,
  inputClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input className={cn('pl-9', inputClassName)} {...props} />
    </div>
  )
}

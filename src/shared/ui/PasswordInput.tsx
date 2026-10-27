import { Eye, EyeClosed } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'

import { Input } from '@shared/ui/Input'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
  error?: string
}

export function PasswordInput({ label, error, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeClosed : Eye

  return (
    <Input
      {...props}
      label={label}
      error={error}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          title={visible ? 'Hide password' : 'Show password'}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="rounded p-1 text-slate-500 outline-none hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <Icon className="h-4 w-4" />
        </button>
      }
    />
  )
}

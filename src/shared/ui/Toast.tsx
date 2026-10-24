import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { readToasts, subscribeToasts } from '@shared/lib/toast'

export function Toaster() {
  const list = useSyncExternalStore(subscribeToasts, readToasts, readToasts)

  if (list.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2"
    >
      {list.map((entry) => (
        <div
          key={entry.id}
          role={entry.tone === 'error' ? 'alert' : undefined}
          className="toast-in flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas shadow-lg"
        >
          {entry.tone === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          )}
          {entry.message}
        </div>
      ))}
    </div>
  )
}

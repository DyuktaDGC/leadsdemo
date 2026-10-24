import type { ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center bg-canvas bg-[radial-gradient(40rem_28rem_at_50%_-10%,var(--color-brand-200),transparent_65%)] p-4 sm:p-6">
      {children}
    </main>
  )
}

export function AuthCard({
  title,
  centered = false,
  children
}: {
  title: string
  centered?: boolean
  children: ReactNode
}) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <header className={centered ? 'mb-6 text-center' : 'mb-6'}>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
      </header>
      {children}
    </div>
  )
}

import { useSession } from '@hooks/useSession'
import { env } from '@shared/lib/env'

export function AccountPage() {
  const { session } = useSession()

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Account</h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-ink">{session?.fullName}</h2>
        <p className="mt-1 text-xs capitalize text-slate-500">{session?.role}</p>
        <p className="mt-4 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {session?.email}
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} {env.appName}</span>
      </footer>
    </div>
  )
}

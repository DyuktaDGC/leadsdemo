import { Navigate, useLocation } from 'react-router-dom'

import { useDemoUsers, useResetDemo, useSession, useSignIn } from '@hooks/useSession'
import { AuthCard, Screen } from '@pages/login/AuthScreen'
import { env } from '@shared/lib/env'
import { Button } from '@shared/ui/Button'

export function LoginPage() {
  const location = useLocation()
  const { session, isPending } = useSession()
  const signIn = useSignIn()
  const users = useDemoUsers().data ?? []
  const resetDemo = useResetDemo()

  if (isPending) return null

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/overview'
    return <Navigate to={from} replace />
  }

  const reset = () => {
    if (!window.confirm('Reset the demo? All changes made in this browser are lost.')) return
    resetDemo.mutate()
  }

  return (
    <Screen>
      <AuthCard title={env.appName}>
        <p className="text-sm text-slate-600">
          Demo mode. Everything runs in this browser. Pick someone to sign in as.
        </p>

        <ul className="mt-5 space-y-3">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                disabled={signIn.isPending}
                onClick={() => signIn.mutate(user.id)}
                className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-white">
                    {user.role}
                  </span>
                  <span className="text-xs font-semibold text-brand-600">Sign in</span>
                </span>
                <span className="text-sm font-medium text-ink">{user.fullName}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>

        <Button variant="secondary" className="mt-5 w-full" disabled={resetDemo.isPending} onClick={reset}>
          Reset demo data
        </Button>
      </AuthCard>
    </Screen>
  )
}

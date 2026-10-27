import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useSendPasswordReset, useSession, useSignedInEmail, useSignIn, useSignInWithGoogle, useSignOut } from '@hooks/useSession'
import { hasErrors, validateCredentials, validateEmail, type FieldErrors } from '@logic/rules/credentials'
import { AuthCard, Screen } from '@pages/login/AuthScreen'
import { env } from '@shared/lib/env'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { PasswordInput } from '@shared/ui/PasswordInput'

export function LoginPage() {
  const location = useLocation()
  const { session, isPending, error: sessionError } = useSession()
  const signIn = useSignIn()
  const reset = useSendPasswordReset()
  const google = useSignInWithGoogle()
  const signOut = useSignOut()
  const linked = useSignedInEmail()
  const [redirectError] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1) || window.location.search).get('error_description')
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const fieldErrors: FieldErrors = submitted ? validateCredentials(email, password) : {}

  if (isPending || linked.isPending) return null

  if (session) {
    const from = (location.state as { from?: string } | null)?.from ?? '/overview'
    return <Navigate to={from} replace />
  }

  if (linked.data) {
    return (
      <Screen>
        <AuthCard title={sessionError ? 'Could not check access' : 'No access'}>
          {sessionError ? (
            <p role="alert" className="text-sm text-slate-600">
              Signed in as <strong className="font-semibold text-ink">{linked.data}</strong>, but the server answered:{' '}
              {sessionError.message}
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              <strong className="font-semibold text-ink">{linked.data}</strong> is not on the {env.appName} access list.
              Ask the owner to add you under Users, then sign in again.
            </p>
          )}
          <Button variant="secondary" className="mt-5 w-full" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
            Use a different account
          </Button>
        </AuthCard>
      </Screen>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors(validateCredentials(email, password))) return
    signIn.mutate({ email, password })
  }

  const busy = signIn.isPending || google.isPending
  const failure = signIn.error ?? reset.error ?? google.error ?? (redirectError ? new Error(redirectError) : null)

  return (
    <Screen>
      <div className="flex w-full max-w-3xl flex-col items-center gap-4 md:flex-row md:items-stretch md:justify-center">
        <AuthCard title={env.appName}>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              error={fieldErrors.email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordInput
              label="Password"
              autoComplete="current-password"
              value={password}
              error={fieldErrors.password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy || reset.isPending}
                onClick={() => {
                  setSubmitted(true)
                  if (!validateEmail(email)) reset.mutate(email)
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {reset.isPending ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            {reset.isSuccess && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                If that email has an account, a link to set a new password is on its way.
              </p>
            )}

            {failure && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {failure.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => google.mutate()}>
            <GoogleIcon />
            {google.isPending ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          <p className="mt-5 text-center text-xs text-slate-500">
            Accounts are created by the owner. New here? Use the link in your invite email to set a password.
          </p>
        </AuthCard>

        {env.demoAccounts.length > 0 && (
          <section
            aria-labelledby="demo-accounts"
            className="flex w-full max-w-sm flex-col rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm sm:p-7"
          >
            <h2 id="demo-accounts" className="text-xl font-bold text-ink">
              Demo access
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick an account to try the app.
            </p>

            <ul className="mt-5 space-y-3">
              {env.demoAccounts.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => signIn.mutate({ email: account.email, password: account.password })}
                    className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-brand-600 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-white">
                        {account.role}
                      </span>
                      <span className="text-xs font-semibold text-brand-600">Sign in</span>
                    </span>
                    <span className="text-sm font-medium text-ink">{account.name}</span>
                    <span className="text-xs text-slate-500">{account.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Screen>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

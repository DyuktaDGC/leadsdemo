import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useSignedInEmail, useUpdateOwnPassword } from '@hooks/useSession'
import { AuthCard, Screen } from '@pages/login/AuthScreen'
import { Button } from '@shared/ui/Button'
import { PasswordInput } from '@shared/ui/PasswordInput'

const MIN_PASSWORD = 8

export function SetPasswordPage() {
  const navigate = useNavigate()
  const update = useUpdateOwnPassword()
  const link = useSignedInEmail()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  if (link.isPending) return null

  if (!link.data) {
    return (
      <Screen>
        <AuthCard title="Link expired">
          <p className="text-sm text-slate-600">
            This link has expired or was already used. Use Forgot password on the sign in page to get a new one.
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
            Go to sign in
          </Link>
        </AuthCard>
      </Screen>
    )
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= MIN_PASSWORD && confirm === password

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready) return
    update.mutate(password, { onSuccess: () => navigate('/overview', { replace: true }) })
  }

  return (
    <Screen>
      <AuthCard title="Set your password">
        <form className="space-y-4" onSubmit={submit} noValidate>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            autoFocus
            value={password}
            error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
            disabled={update.isPending}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            error={mismatch ? 'The two passwords do not match.' : undefined}
            disabled={update.isPending}
            onChange={(event) => setConfirm(event.target.value)}
          />
          {update.isError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {update.error.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!ready || update.isPending}>
            {update.isPending ? 'Saving…' : 'Save and sign in'}
          </Button>
        </form>
      </AuthCard>
    </Screen>
  )
}

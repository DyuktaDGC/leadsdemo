import { useState } from 'react'

import { useSession, useUpdateOwnPassword } from '@hooks/useSession'
import { isOwner } from '@logic/rules/session'
import { env } from '@shared/lib/env'
import { Button } from '@shared/ui/Button'
import { PasswordInput } from '@shared/ui/PasswordInput'

const MIN_PASSWORD = 8

export function AccountPage() {
  const { session } = useSession()

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 sm:space-y-6 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Account</h1>
      </header>

      <PasswordCard />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-ink">Email</h2>
        <p className="mt-1 text-xs text-slate-500">
          {isOwner(session)
            ? 'This is the address you sign in with. It cannot be changed here. Add a user with the new address, then remove the old account.'
            : 'This is the address you sign in with. It cannot be changed. Ask the owner if you need a different one.'}
        </p>
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

function PasswordCard() {
  const update = useUpdateOwnPassword()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const mismatch = confirm.length > 0 && confirm !== password
  const ready = password.length >= MIN_PASSWORD && confirm === password

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready) return

    update.mutate(password, {
      onSuccess: () => {
        setPassword('')
        setConfirm('')
      }
    })
  }

  return (
    <Card
      title="Password"
      hint="Sets the password for signing in with your email."
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={password}
          error={tooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
          disabled={update.isPending}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          error={mismatch ? 'The two passwords do not match.' : undefined}
          disabled={update.isPending}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <Notice error={update.error as Error | null} done={update.isSuccess && 'Password updated.'} />

        <Button type="submit" disabled={!ready || update.isPending}>
          {update.isPending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </Card>
  )
}

function Card({
  title,
  hint,
  children
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">{hint}</p>
      {children}
    </section>
  )
}

function Notice({ error, done }: { error: Error | null; done: string | false }) {
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error.message}
      </p>
    )
  }
  if (done) {
    return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{done}</p>
  }
  return null
}

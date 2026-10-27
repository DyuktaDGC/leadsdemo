import type { Session } from '@logic/rules/session'
import { call } from '@shared/lib/backend'
import { readCachedSession, writeCachedSession } from '@shared/lib/sessionCache'
import { supabase } from '@shared/lib/supabase'

const friendly = (message: string) =>
  /invalid login credentials/i.test(message) ? 'Email or password is invalid.' : message

export async function fetchSession(): Promise<Session | null> {
  const session = await call<Session | null>('currentSession')
  writeCachedSession(session)
  return session
}

export const cachedSession = () => readCachedSession<Session>()

export const fetchSignedInEmail = async () =>
  (await supabase?.auth.getSession())?.data.session?.user.email ?? null

const NO_AUTH = 'Sign in is not set up yet.'

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error(NO_AUTH)
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new Error(friendly(error.message))
}

export async function signOut(): Promise<void> {
  writeCachedSession(null)
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function updateOwnPassword(password: string): Promise<void> {
  if (!supabase) throw new Error(NO_AUTH)
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error(NO_AUTH)
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/set-password`
  })
  if (error) throw new Error(error.message)
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error(NO_AUTH)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` }
  })
  if (error) throw new Error(error.message)
}

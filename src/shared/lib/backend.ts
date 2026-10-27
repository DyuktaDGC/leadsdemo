import { post } from '@shared/lib/mockServer'
import { writeCachedSession } from '@shared/lib/sessionCache'
import { supabase } from '@shared/lib/supabase'

export async function call<T>(action: string, ...args: unknown[]): Promise<T> {
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? null
  const body = post(action, args, token) as { ok: boolean; data?: T; error?: string }
  if (!body.ok) {
    if (/session has expired/i.test(body.error ?? '') && window.location.pathname !== '/login') {
      writeCachedSession(null)
      await supabase.auth.signOut()
      window.location.assign('/login')
    }
    throw new Error(body.error ?? 'Something went wrong.')
  }
  return body.data as T
}

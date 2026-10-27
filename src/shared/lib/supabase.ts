// Mock Supabase Auth: same calls the app makes on the real client, kept in localStorage.
// Every account's password is DEMO_PASSWORD until changed on the Set password screen.
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_OWNER_EMAIL = 'anita@dgcdemo.in'

const SESSION = 'leaddgc.mock.auth'
const PASSWORDS = 'leaddgc.mock.passwords'
const SIGNED_IN = 'leaddgc.mock.signedIn'

type AuthResult = { error: { message: string } | null }
type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED'
const listeners = new Set<(event: AuthEvent) => void>()

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export const signedInEmails = () => read<string[]>(SIGNED_IN, [])

function startSession(email: string, event: AuthEvent = 'SIGNED_IN'): AuthResult {
  write(SESSION, email)
  write(SIGNED_IN, [...new Set([...signedInEmails(), email])])
  listeners.forEach((listener) => listener(event))
  return { error: null }
}

const fail = (message: string): AuthResult => ({ error: { message } })
const passwordOf = (email: string) => read<Record<string, string>>(PASSWORDS, {})[email] ?? DEMO_PASSWORD

export const supabase = {
  auth: {
    async getSession() {
      const email = read<string | null>(SESSION, null)
      return { data: { session: email ? { access_token: email, user: { email } } : null } }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      return password === passwordOf(email) ? startSession(email) : fail('Invalid login credentials')
    },
    async signOut(): Promise<AuthResult> {
      write(SESSION, null)
      listeners.forEach((listener) => listener('SIGNED_OUT'))
      return { error: null }
    },
    async updateUser({ password }: { password: string }) {
      const email = read<string | null>(SESSION, null)
      if (!email) return fail('Auth session missing!')
      write(PASSWORDS, { ...read(PASSWORDS, {}), [email]: password })
      return startSession(email, 'USER_UPDATED')
    },
    async resetPasswordForEmail(email: string, options: { redirectTo: string }): Promise<AuthResult> {
      console.info(`Mock reset email to ${email}: sign in, then open ${options.redirectTo}`)
      return { error: null }
    },
    async signInWithOAuth({ options }: { provider: 'google'; options: { redirectTo: string } }): Promise<AuthResult> {
      startSession(DEMO_OWNER_EMAIL)
      window.location.assign(options.redirectTo)
      return { error: null }
    },
    onAuthStateChange(listener: (event: AuthEvent) => void) {
      listeners.add(listener)
    }
  }
}

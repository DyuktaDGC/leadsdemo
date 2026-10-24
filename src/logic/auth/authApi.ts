import type { Session } from '@logic/rules/session'
import { call, demoUsers, resetDemo, setCurrentUser } from '@shared/lib/backend'

export const fetchSession = () => call<Session | null>('currentSession')

export async function signIn(userId: string): Promise<void> {
  setCurrentUser(userId)
}

export async function signOut(): Promise<void> {
  setCurrentUser(null)
}

export const listDemoUsers = async () => demoUsers()

export const resetDemoData = async () => resetDemo()

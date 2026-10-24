import { moveLeads } from '@logic/leads/leadsApi'
import type { Role } from '@logic/rules/session'
import type { AppUser } from '@logic/users/userTypes'
import { call } from '@shared/lib/backend'

export const listUsers = () => call<AppUser[]>('listUsers')

export const createUser = (input: { email: string; fullName: string; role: Role }) => call<string>('createUser', input)

export const updateUser = (input: { id: string; fullName?: string; role?: Role; active?: boolean }) =>
  call<void>('updateUser', input)

export const deleteUser = (id: string) => call<void>('deleteUser', id)

export async function handOver(from: AppUser, toUserId: string, keep: boolean, deactivate: boolean): Promise<number> {
  const moved = await moveLeads(from.id, toUserId, keep)
  if (deactivate && !keep && from.active) await updateUser({ id: from.id, active: false })
  return moved
}

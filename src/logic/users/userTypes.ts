import type { Role } from '@logic/rules/session'

export type AppUser = {
  id: string
  email: string
  fullName: string
  role: Role
  active: boolean
}

export const userName = (user: AppUser) => user.fullName || user.email

export type Role = 'owner' | 'employee'

export type Session = {
  userId: string
  email: string
  fullName: string
  role: Role
}

type LeadsView = 'mine' | 'unassigned' | 'others' | 'all'

export function isOwner(session: Session | null): boolean {
  return session?.role === 'owner'
}

export function allowedLeadsViews(session: Session | null): LeadsView[] {
  return session ? ['mine', 'unassigned', 'all'] : []
}

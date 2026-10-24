import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useSession } from '@hooks/useSession'
import { isOwner } from '@logic/rules/session'
import { Loading } from '@shared/ui/Loading'

function FullScreenLoading() {
  return <Loading className="min-h-screen bg-canvas" />
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { session, isPending } = useSession()

  if (isPending) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <>{children}</>
}

export function RequireOwner({ children }: { children: ReactNode }) {
  const { session, isPending } = useSession()

  if (isPending) return <FullScreenLoading />
  if (!isOwner(session)) return <Navigate to="/overview" replace />

  return <>{children}</>
}

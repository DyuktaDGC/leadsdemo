import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchSession, listDemoUsers, resetDemoData, signIn, signOut } from '@logic/auth/authApi'
import type { Session } from '@logic/rules/session'
import { queryKeys } from '@shared/lib/queryKeys'

type SessionState = {
  isPending: boolean
  session: Session | null
}

export function useSession(): SessionState {
  const { data, isPending } = useQuery({ queryKey: queryKeys.auth.session, queryFn: fetchSession })
  return { isPending, session: data ?? null }
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signIn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  })
}

export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
    onSettled: () => window.location.replace('/login')
  })
}

export function useDemoUsers() {
  return useQuery({ queryKey: queryKeys.auth.users, queryFn: listDemoUsers })
}

export function useResetDemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resetDemoData,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  })
}

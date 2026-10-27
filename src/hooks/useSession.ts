import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cachedSession, fetchSession, fetchSignedInEmail, sendPasswordReset, signIn, signInWithGoogle, signOut, updateOwnPassword } from '@logic/auth/authApi'
import type { Session } from '@logic/rules/session'
import { queryKeys } from '@shared/lib/queryKeys'

type SessionState = {
  isPending: boolean
  session: Session | null
  error: Error | null
}

export function useSession(): SessionState {
  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: fetchSession,
    initialData: cachedSession,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000
  })
  return { isPending: isPending || (isFetching && !data), session: data ?? null, error }
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  })
}

export function useSignedInEmail() {
  return useQuery({ queryKey: queryKeys.auth.email, queryFn: fetchSignedInEmail })
}

export function useUpdateOwnPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateOwnPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
  })
}

export function useSendPasswordReset() {
  return useMutation({ mutationFn: sendPasswordReset })
}

export function useSignInWithGoogle() {
  return useMutation({ mutationFn: signInWithGoogle })
}

export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
    onSettled: () => window.location.replace('/login')
  })
}

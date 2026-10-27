import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { setUserProjects } from '@logic/projects/projectsApi'
import type { Role } from '@logic/rules/session'
import { createUser, deleteUser, handOver, listUsers, updateUser } from '@logic/users/usersApi'
import { userName, type AppUser } from '@logic/users/userTypes'
import { pluralize } from '@shared/lib/format'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: listUsers,
    refetchInterval: 15_000
  })
}

function useUserWrite<Input, Result>(write: (input: Input) => Promise<Result>, done: string) {
  const refresh = useRefreshPeople()

  return useMutation<Result, Error, Input>({
    mutationFn: write,
    onSuccess: () => {
      void refresh()
      toast(done)
    }
  })
}

type ProjectAccess = { projectIds: string[] | null }

async function saveUser({ projectIds, ...input }: Parameters<typeof updateUser>[0] & ProjectAccess) {
  await updateUser(input)
  if (projectIds) await setUserProjects(input.id, projectIds)
}

export function useUpdateUser() {
  return useUserWrite(saveUser, 'User updated')
}

export function useDeleteUser() {
  return useUserWrite(deleteUser, 'User deleted')
}

const handoverMessage = (moved: number, from: string, to: string, keep: boolean) =>
  moved === 0
    ? `${from} had no open leads to move`
    : `${pluralize(moved, 'lead')} ${keep ? 'shared with' : 'moved to'} ${to}`

function useRefreshPeople() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    ])
}

type NewUser = ProjectAccess & {
  email: string
  fullName: string
  role: Role
  leaving: AppUser | null
  keep: boolean
  deactivate: boolean
}

export function useAddUser() {
  const refresh = useRefreshPeople()
  const [createdId, setCreatedId] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ email, fullName, role, leaving, keep, deactivate, projectIds }: NewUser) => {
      const id = createdId ?? (await createUser({ email, fullName, role }))
      setCreatedId(id)
      if (projectIds) await setUserProjects(id, projectIds)
      const name = fullName || email
      const moved = leaving ? await handOver(leaving, id, keep, deactivate) : null
      return { name, moved }
    },
    onSuccess: ({ name, moved }, { leaving, keep }) =>
      toast(moved === null || !leaving ? 'User added' : handoverMessage(moved, userName(leaving), name, keep)),
    onSettled: refresh
  })

  const reset = () => {
    mutation.reset()
    setCreatedId(null)
  }

  return { ...mutation, createdId, reset }
}

export function useHandOver() {
  const refresh = useRefreshPeople()

  return useMutation({
    mutationFn: ({ from, to, keep, deactivate }: { from: AppUser; to: AppUser; keep: boolean; deactivate: boolean }) =>
      handOver(from, to.id, keep, deactivate),
    onSuccess: (moved, { from, to, keep }) => toast(handoverMessage(moved, userName(from), userName(to), keep)),
    onSettled: refresh
  })
}

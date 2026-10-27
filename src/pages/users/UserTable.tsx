import { useState } from 'react'

import { useProjects } from '@hooks/useProjects'
import { useSession } from '@hooks/useSession'
import { useDeleteUser } from '@hooks/useUsers'
import { projectsOf } from '@logic/rules/projects'
import type { AppUser } from '@logic/users/userTypes'
import { Badge } from '@shared/ui/Badge'
import { Button } from '@shared/ui/Button'
import { Modal } from '@shared/ui/Modal'
import { Table, type Column } from '@shared/ui/Table'

export function UserTable({
  users,
  isLoading,
  onEdit,
  onHandover
}: {
  users: AppUser[]
  isLoading: boolean
  onEdit: (user: AppUser) => void
  onHandover?: (user: AppUser) => void
}) {
  const { session } = useSession()
  const remove = useDeleteUser()
  const { projects } = useProjects()

  const projectNames = (user: AppUser) =>
    user.role === 'owner'
      ? 'All projects'
      : projectsOf(projects, user.id)
          .map((project) => project.name)
          .join(', ') || 'No projects'

  const [confirming, setConfirming] = useState<AppUser | null>(null)

  const actions = (user: AppUser) => (
    <>
      <Button variant="secondary" size="sm" onClick={() => onEdit(user)}>
        Edit
      </Button>
      {onHandover && (
        <Button variant="secondary" size="sm" onClick={() => onHandover(user)}>
          Hand over
        </Button>
      )}
      {user.id !== session?.userId && (
        <Button variant="ghostDanger" size="sm" onClick={() => setConfirming(user)}>
          Delete
        </Button>
      )}
    </>
  )

  const roleBadge = (user: AppUser) => (
    <Badge tone={user.role === 'owner' ? 'info' : 'neutral'}>{user.role}</Badge>
  )

  const statusBadge = (user: AppUser) =>
    !user.active ? (
      <Badge tone="warning">Inactive</Badge>
    ) : user.pending ? (
      <Badge tone="info">Not signed in yet</Badge>
    ) : (
      <Badge tone="success">Active</Badge>
    )

  const columns: Column<AppUser>[] = [
    { key: 'name', header: 'Name', cell: (user) => <span className="font-semibold text-ink">{user.fullName || 'N/A'}</span> },
    { key: 'email', header: 'Email', className: 'wrap-anywhere', cell: (user) => user.email },
    { key: 'role', header: 'Role', cell: roleBadge },
    { key: 'projects', header: 'Projects', cell: (user) => <span className="text-slate-600">{projectNames(user)}</span> },
    { key: 'status', header: 'Status', cell: statusBadge },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      mobile: 'bare',
      cell: (user) => <div className="flex justify-end gap-2 max-xl:[&>*]:flex-1">{actions(user)}</div>
    }
  ]

  const close = () => {
    remove.reset()
    setConfirming(null)
  }

  return (
    <>
      <Table
        columns={columns}
        rows={users}
        rowKey={(user) => user.id}
        onRowClick={onEdit}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No users yet."
      />

      {confirming && (
        <Modal open onClose={close} title="Delete user">
          <p className="text-sm text-slate-600">
            Delete <span className="font-medium text-ink">{confirming.email}</span> permanently?
            Their account and their history in this dashboard go with it. Setting them to Inactive
            instead keeps the record and blocks sign in.
          </p>

          {remove.isError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {(remove.error as Error).message}
            </p>
          )}

          <footer className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>
              Keep
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(confirming.id, { onSuccess: close })}
            >
              {remove.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </footer>
        </Modal>
      )}
    </>
  )
}

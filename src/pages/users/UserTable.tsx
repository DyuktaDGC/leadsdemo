import { useState } from 'react'

import { useSession } from '@hooks/useSession'
import { useDeleteUser } from '@hooks/useUsers'
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
    ) : (
      <Badge tone="success">Active</Badge>
    )

  const columns: Column<AppUser>[] = [
    { key: 'name', header: 'Name', cell: (user) => user.fullName || 'N/A' },
    { key: 'email', header: 'Email', className: 'wrap-anywhere', cell: (user) => user.email },
    { key: 'role', header: 'Role', cell: roleBadge },
    { key: 'status', header: 'Status', cell: statusBadge },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (user) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          {actions(user)}
        </div>
      )
    }
  ]

  const close = () => {
    remove.reset()
    setConfirming(null)
  }

  const table = (
    <Table
      columns={columns}
      rows={users}
      rowKey={(user) => user.id}
      onRowClick={onEdit}
      isLoading={isLoading}
      pageSize={10}
      emptyMessage="No users yet."
    />
  )

  return (
    <>
      {isLoading || users.length === 0 ? (
        table
      ) : (
        <>
          <ul className="space-y-3 sm:hidden">
            {users.map((user) => (
              <li
                key={user.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{user.fullName || 'N/A'}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="mt-0.5 text-xs capitalize text-slate-400">{user.role}</p>
                  </div>
                  <span className="shrink-0">{statusBadge(user)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {actions(user)}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">{table}</div>
        </>
      )}

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

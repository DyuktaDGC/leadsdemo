import { useState } from 'react'

import { useSession } from '@hooks/useSession'
import { useUpdateUser } from '@hooks/useUsers'
import type { Role } from '@logic/rules/session'
import type { AppUser } from '@logic/users/userTypes'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { Modal } from '@shared/ui/Modal'
import { Select } from '@shared/ui/Select'

export function EditUserDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { session } = useSession()
  const update = useUpdateUser()

  const [fullName, setFullName] = useState(user.fullName)
  const [role, setRole] = useState<Role>(user.role)
  const [active, setActive] = useState(user.active)

  const isSelf = user.id === session?.userId
  const busy = update.isPending
  const error = update.error as Error | null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    update.mutate(
      {
        id: user.id,
        fullName: fullName.trim(),
        ...(isSelf ? {} : { role, active })
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal open onClose={onClose} title="Edit user">
      <form id="edit-user" className="space-y-4" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {user.email}
          </p>
          <p className="text-xs text-slate-500">
            Fixed once created. It is the address they sign in with. To change it, delete this
            user and add them again.
          </p>
        </div>

        <Input
          label="Full name"
          autoFocus
          value={fullName}
          disabled={busy}
          onChange={(event) => setFullName(event.target.value)}
        />
        <Select
          label="Role"
          value={role}
          disabled={isSelf || busy}
          onChange={(value) => setRole(value === 'owner' ? 'owner' : 'employee')}
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'owner', label: 'Owner' }
          ]}
        />
        <Select
          label="Status"
          value={active ? 'active' : 'inactive'}
          disabled={isSelf || busy}
          onChange={(value) => setActive(value === 'active')}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive, cannot sign in' }
          ]}
        />

        {isSelf && (
          <p className="text-xs text-slate-500">
            This is your own account. Role and status are locked so you cannot lock yourself out.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
      </form>
      <footer className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" form="edit-user" disabled={busy}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </footer>
    </Modal>
  )
}

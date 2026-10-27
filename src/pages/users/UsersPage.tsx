import { UserPlus } from 'lucide-react'
import { useState } from 'react'

import { useUsers } from '@hooks/useUsers'
import type { AppUser } from '@logic/users/userTypes'
import { AddUserDialog } from '@pages/users/AddUserDialog'
import { EditUserDialog } from '@pages/users/EditUserDialog'
import { HandoverUserDialog } from '@pages/users/HandoverUserDialog'
import { UserTable } from '@pages/users/UserTable'
import { Button } from '@shared/ui/Button'

export function UsersPage() {
  const users = useUsers()
  const everyone = users.data ?? []
  const ordered = [...everyone.filter((person) => person.role === 'owner'), ...everyone.filter((person) => person.role !== 'owner')]
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [handing, setHanding] = useState<AppUser | null>(null)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Users</h1>
        <Button onClick={() => setAdding(true)}>
          <UserPlus className="h-4 w-4" />
          Add user
        </Button>
      </header>

      {users.isError && <p className="text-sm text-red-600">{(users.error as Error).message}</p>}

      <UserTable
        users={ordered}
        isLoading={users.isPending}
        onEdit={setEditing}
        onHandover={setHanding}
      />
      <AddUserDialog open={adding} onClose={() => setAdding(false)} />
      {handing && (
        <HandoverUserDialog
          key={handing.id}
          user={handing}
          users={everyone}
          onClose={() => setHanding(null)}
        />
      )}
      {editing && (
        <EditUserDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

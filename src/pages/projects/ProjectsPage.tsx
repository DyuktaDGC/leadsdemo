import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useDeleteProject, useProjects, useSaveProject } from '@hooks/useProjects'
import { useUsers } from '@hooks/useUsers'
import { type Project } from '@logic/rules/projects'
import { cn } from '@shared/lib/cn'
import { Button } from '@shared/ui/Button'
import { Card } from '@shared/ui/Card'
import { Input } from '@shared/ui/Input'
import { Loading } from '@shared/ui/Loading'
import { Modal } from '@shared/ui/Modal'

export function ProjectsPage() {
  const { projects, isPending, isError, error } = useProjects()
  const remove = useDeleteProject()

  const [editing, setEditing] = useState<{ project: Project | null } | null>(null)
  const [doomed, setDoomed] = useState<Project | null>(null)

  const closeDoomed = () => {
    remove.reset()
    setDoomed(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Projects</h1>
        <Button onClick={() => setEditing({ project: null })} disabled={isPending}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </header>

      {isError && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      {isPending ? (
        <Loading />
      ) : projects.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            No projects yet. Add one, then put people on it.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
              <Card key={project.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">{project.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {project.memberNames.length > 0
                        ? project.memberNames.join(', ')
                        : 'Nobody assigned'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditing({ project })}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghostDanger"
                      size="sm"
                      onClick={() => setDoomed(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </Card>
          ))}
        </div>
      )}

      {doomed && (
        <Modal
          open
          onClose={closeDoomed}
          title="Delete project"
          footer={
            <>
              <Button variant="secondary" onClick={closeDoomed} disabled={remove.isPending}>
                Keep
              </Button>
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(doomed.id, { onSuccess: closeDoomed })}
              >
                {remove.isPending ? 'Deleting…' : 'Delete project'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold text-ink">{doomed.name}</span>? Its leads stay,
            but only the owner will see them.
          </p>
          {remove.isError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {remove.error.message}
            </p>
          )}
        </Modal>
      )}
      {editing && (
        <ProjectDialog
          key={editing.project?.id ?? 'new'}
          project={editing.project}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function ProjectDialog({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}) {
  const users = useUsers()
  const save = useSaveProject()

  const [name, setName] = useState(project?.name ?? '')
  const [picked, setPicked] = useState<string[]>(project?.memberIds ?? [])
  const busy = save.isPending
  const failure = save.error?.message ?? null

  const roster = (users.data ?? []).filter((person) => person.active)
  const allPicked = roster.length > 0 && picked.length === roster.length

  const toggle = (id: string) =>
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )

  const trimmed = name.trim()
  const blocked = !trimmed ? 'Name the project.' : null

  const submit = () => {
    if (blocked || busy) return
    save.mutate({ project, name: trimmed, memberIds: picked }, { onSuccess: onClose })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? `Edit ${project.name}` : 'New project'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={blocked !== null || busy}>
            {busy ? 'Saving…' : project ? 'Save changes' : 'Add project'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Project name"
          autoFocus
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">
              Team <span className="text-xs font-normal text-slate-400">(optional)</span>
            </span>
            {roster.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPicked(allPicked ? [] : roster.map((person) => person.id))}
                className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {allPicked ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Only these people see this project&apos;s leads.
          </p>
          {roster.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody is active.</p>
          ) : (
            <ul className="scrollbar-thin max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-300">
              {roster.map((person) => {
                const on = picked.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(person.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        on ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{person.fullName || person.email}</span>
                      {person.role === 'owner' && (
                        <span className="ml-auto text-2xs uppercase tracking-wide text-slate-400">
                          owner
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {failure && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {failure}
          </p>
        )}
      </div>
    </Modal>
  )
}

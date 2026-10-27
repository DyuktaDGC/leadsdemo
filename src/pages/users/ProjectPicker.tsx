import { Check } from 'lucide-react'

import { useProjects } from '@hooks/useProjects'
import { projectsOf } from '@logic/rules/projects'
import { cn } from '@shared/lib/cn'

export function ProjectPicker({
  owner,
  userId,
  picked: chosen,
  onChange,
  disabled
}: {
  owner: boolean
  userId?: string
  picked: string[] | null
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const all = useProjects().projects
  if (owner) return <p className="text-xs text-slate-500">Owners see every project.</p>

  const projects = all.filter((project) => project.active)
  const picked = chosen ?? (userId ? projectsOf(all, userId).map((project) => project.id) : [])
  const toggle = (id: string) => onChange(picked.includes(id) ? picked.filter((v) => v !== id) : [...picked, id])

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">Projects they can see</p>
      {projects.length === 0 ? (
        <p className="text-sm text-slate-500">No active projects yet.</p>
      ) : (
        <ul className="scrollbar-thin max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-300">
          {projects.map((project) => {
            const on = picked.includes(project.id)
            return (
              <li key={project.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(project.id)}
                  aria-pressed={on}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
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
                  <span className="truncate">{project.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

import { ChevronDown } from 'lucide-react'

import type { Lead } from '@logic/leads/leadTypes'
import { pluralize } from '@shared/lib/format'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function LeadHandlerCard({
  name,
  leads,
  projects
}: {
  name: string
  leads: Lead[]
  projects: number
}) {
  const perProject = [
    ...leads.reduce((counts, lead) => {
      const project = lead.project?.trim() || 'No project'
      return counts.set(project, (counts.get(project) ?? 0) + 1)
    }, new Map<string, number>())
  ].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  return (
    <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 transition-colors hover:bg-brand-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 group-open:border-b group-open:border-slate-100 sm:gap-3 sm:px-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 sm:h-10 sm:w-10">
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block truncate text-xs text-slate-500">
            {pluralize(projects, 'project')}
          </span>
        </span>
        <span className="shrink-0 border-l border-slate-200 pl-2 text-right sm:pl-3">
          <span className="block text-lg font-bold leading-none tabular-nums text-ink">
            {leads.length}
          </span>
          <span className="block text-2xs uppercase tracking-wide text-slate-400">leads</span>
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 transition-transform duration-200 group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      {perProject.length === 0 ? (
        <p className="px-4 py-4 text-center text-sm text-slate-400">No leads yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 px-3 sm:px-4">
          {perProject.map(([project, count]) => (
            <li key={project} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm text-slate-700">{project}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {pluralize(count, 'lead')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

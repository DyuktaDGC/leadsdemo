import { sameProject } from './projects.ts'

export type RequirementFilters = {
  project?: string
}

export function matchesRequirements(
  lead: { project: string | null },
  filters: RequirementFilters
): boolean {
  return !filters.project || sameProject(lead.project, filters.project)
}

export function distinctValues<T>(rows: T[], pick: (row: T) => string | null): string[] {
  const seen = new Map<string, string>()
  for (const row of rows) {
    const value = (pick(row) ?? '').trim()
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

export type Project = {
  id: string
  name: string
  active: boolean
  memberIds: string[]
  memberNames: string[]
}

export function projectsOf(projects: Project[], userId: string): Project[] {
  return projects.filter((project) => project.active && project.memberIds.includes(userId))
}

export function sameProject(a: string | null, b: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
}


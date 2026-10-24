import type { Project } from '@logic/rules/projects'
import { call } from '@shared/lib/backend'

type ProjectWriteInput =
  | { action: 'addProject'; name: string }
  | { action: 'updateProject'; projectId: string; name?: string; active?: boolean }
  | { action: 'deleteProject'; projectId: string }
  | { action: 'setMembers'; projectId: string; userIds: string[] }
type ProjectWriteResult = { projectId?: string }

export const fetchProjects = async () => ({ projects: await call<Project[]>('listProjects') })

export const writeProject = (input: ProjectWriteInput) => call<ProjectWriteResult>('writeProject', input)

export async function saveProject(project: Project | null, name: string, memberIds: string[]): Promise<string> {
  let projectId = project?.id ?? ''
  if (!project) projectId = (await writeProject({ action: 'addProject', name })).projectId ?? ''
  else if (name !== project.name) await writeProject({ action: 'updateProject', projectId, name })

  const sameTeam =
    project !== null &&
    memberIds.length === project.memberIds.length &&
    memberIds.every((id) => project.memberIds.includes(id))
  if (projectId && !sameTeam) await writeProject({ action: 'setMembers', projectId, userIds: memberIds })
  return projectId
}

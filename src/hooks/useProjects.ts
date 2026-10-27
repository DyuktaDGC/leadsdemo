import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useSession } from '@hooks/useSession'
import { fetchProjects, saveProject, writeProject } from '@logic/projects/projectsApi'
import { projectsOf, type Project } from '@logic/rules/projects'
import { queryKeys } from '@shared/lib/queryKeys'
import { toast } from '@shared/lib/toast'

const NO_PROJECTS: Project[] = []

export function useProjects() {
  const result = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: fetchProjects,
    refetchInterval: 5 * 60_000
  })

  return {
    ...result,
    projects: result.data?.projects ?? NO_PROJECTS
  }
}

export function useMyProjectNames(): string[] | null {
  const { session } = useSession()
  const { projects } = useProjects()
  const owner = session?.role === 'owner'
  const userId = session?.userId ?? null

  return useMemo(() => {
    if (owner) return null
    return userId === null ? [] : projectsOf(projects, userId).map((project) => project.name)
  }, [owner, userId, projects])
}

export function useActiveProjectNames(): string[] {
  const { projects } = useProjects()
  return useMemo(
    () => projects.filter((project) => project.active).map((project) => project.name),
    [projects]
  )
}

function useRefreshProjects() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })
    ])
}

export function useDeleteProject() {
  const refresh = useRefreshProjects()

  return useMutation({
    mutationFn: (projectId: string) => writeProject({ action: 'deleteProject', projectId }),
    onSuccess: () => toast('Project deleted'),
    onSettled: refresh
  })
}

export function useSaveProject() {
  const refresh = useRefreshProjects()

  return useMutation({
    mutationFn: ({ project, name, memberIds }: { project: Project | null; name: string; memberIds: string[] }) =>
      saveProject(project, name, memberIds),
    onSuccess: (_projectId, { project }) => toast(project ? 'Project updated' : 'Project added'),
    onSettled: refresh
  })
}

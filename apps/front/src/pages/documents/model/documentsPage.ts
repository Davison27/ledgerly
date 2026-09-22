import type { Project } from '@/entities/project';

export function shouldClearProjectFilter(
  clientId: string | undefined,
  projectId: string | undefined,
  projects: Project[],
  projectsPending: boolean,
  projectsError: boolean,
): boolean {
  return Boolean(
    clientId &&
      projectId &&
      !projectsPending &&
      !projectsError &&
      !projects.some((project) => project.id === projectId),
  );
}

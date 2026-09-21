import type { Project, ProjectDeletionOutcome } from '@/entities/project';

export function isProjectArchived(project: Project): boolean {
  return project.status === 'archived';
}

export function visibleProjects(projects: Project[], showArchived: boolean): Project[] {
  return showArchived ? projects : projects.filter((project) => !isProjectArchived(project));
}

export function projectDeletionMessageKey(outcome: ProjectDeletionOutcome):
  | 'projects.deleted'
  | 'projects.archived' {
  return outcome === 'archived' ? 'projects.archived' : 'projects.deleted';
}

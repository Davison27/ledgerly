import type { Project } from '@/entities/project';

export function projectClientProjectsPath(project: Pick<Project, 'client'>): string | null {
  const clientId = project.client?.id;
  return clientId ? `/companies/${encodeURIComponent(clientId)}/projects` : null;
}

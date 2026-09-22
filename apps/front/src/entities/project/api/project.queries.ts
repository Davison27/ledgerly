import { queryOptions } from '@tanstack/react-query';
import { fetchProject, fetchProjects } from '../model/project';

export const projectQueries = {
  all: ['projects'] as const,
  list: (clientId?: string) =>
    queryOptions({
      queryKey: ['projects', 'list', clientId ?? null] as const,
      queryFn: () => fetchProjects(clientId),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['projects', 'detail', id] as const,
      queryFn: () => fetchProject(id),
    }),
};

import { queryOptions } from '@tanstack/react-query';
import { fetchProject, fetchProjects } from '../model/project';

export const projectQueries = {
  all: ['projects'] as const,
  list: () =>
    queryOptions({
      queryKey: ['projects', 'list'] as const,
      queryFn: fetchProjects,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['projects', 'detail', id] as const,
      queryFn: () => fetchProject(id),
    }),
};

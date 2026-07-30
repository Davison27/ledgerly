import { queryOptions } from '@tanstack/react-query';
import { listProjectProducts } from './project-products.api';

export const projectProductQueries = {
  all: ['project-products'] as const,
  list: (projectId: string) => queryOptions({
    queryKey: [...projectProductQueries.all, projectId],
    queryFn: () => listProjectProducts(projectId),
  }),
};

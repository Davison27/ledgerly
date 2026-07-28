import { queryOptions } from '@tanstack/react-query';
import { getAuthStatus } from './session.api';

export const sessionQueries = {
  all: ['session'] as const,
  status: () =>
    queryOptions({
      queryKey: [...sessionQueries.all, 'status'] as const,
      queryFn: () => getAuthStatus(),
      staleTime: 0,
    }),
};

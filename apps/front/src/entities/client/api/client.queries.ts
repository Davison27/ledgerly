import { queryOptions } from '@tanstack/react-query';
import { listClients } from './clients.api';

export const clientQueries = {
  all: ['clients'] as const,
  list: () =>
    queryOptions({
      queryKey: ['clients', 'list'] as const,
      queryFn: listClients,
    }),
};

import { queryOptions } from '@tanstack/react-query';
import { getClient, listClients } from './clients.api';

export const clientQueries = {
  all: ['clients'] as const,
  list: () =>
    queryOptions({
      queryKey: ['clients', 'list'] as const,
      queryFn: listClients,
    }),
  detail: (clientId: string) =>
    queryOptions({
      queryKey: ['clients', 'detail', clientId] as const,
      queryFn: () => getClient(clientId),
    }),
};

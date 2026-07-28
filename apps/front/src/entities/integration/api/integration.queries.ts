import { queryOptions } from '@tanstack/react-query';
import { listIntegrations } from './integrations.api';

export const integrationQueries = {
  all: ['integrations'] as const,
  list: () =>
    queryOptions({
      queryKey: [...integrationQueries.all, 'list'] as const,
      queryFn: () => listIntegrations(),
    }),
};

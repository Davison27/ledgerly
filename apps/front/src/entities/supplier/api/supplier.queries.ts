import { queryOptions } from '@tanstack/react-query';
import { listSuppliers } from './suppliers.api';

export const supplierQueries = {
  all: ['suppliers'] as const,
  list: () =>
    queryOptions({
      queryKey: ['suppliers', 'list'] as const,
      queryFn: listSuppliers,
    }),
};

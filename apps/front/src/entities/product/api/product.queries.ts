import { queryOptions } from '@tanstack/react-query';
import { listProducts } from './products.api';

export const productQueries = {
  all: ['products'] as const,
  list: () =>
    queryOptions({
      queryKey: ['products', 'list'] as const,
      queryFn: listProducts,
    }),
};

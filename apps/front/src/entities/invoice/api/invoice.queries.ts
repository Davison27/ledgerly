import { queryOptions } from '@tanstack/react-query';
import { listInvoices } from './invoices.api';

export const invoiceQueries = {
  all: ['invoices'] as const,
  list: () =>
    queryOptions({
      queryKey: ['invoices', 'list'] as const,
      queryFn: listInvoices,
    }),
};

import { queryOptions } from '@tanstack/react-query';
import { listInvoices, listInvoicesPage } from './invoices.api';

export const invoiceQueries = {
  all: ['invoices'] as const,
  list: () =>
    queryOptions({
      queryKey: ['invoices', 'list'] as const,
      queryFn: listInvoices,
    }),
  listPage: (page = 1, size = 20, search = '') =>
    queryOptions({
      queryKey: ['invoices', 'list-page', page, size, search] as const,
      queryFn: () => listInvoicesPage(page, size, search),
    }),
};

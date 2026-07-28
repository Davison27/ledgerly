import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchCompanyBranding } from './company.api';
import { fetchCompany, type Company } from '../model/company';

export const EMPTY_COMPANY: Company = { id: '', name: '' };

export const companyQueries = {
  all: ['company'] as const,
  singleton: () =>
    queryOptions({
      queryKey: ['company'] as const,
      queryFn: () => fetchCompany().catch(() => EMPTY_COMPANY),
      staleTime: 300_000,
    }),
  branding: () =>
    queryOptions({
      queryKey: ['company', 'branding'] as const,
      queryFn: () => fetchCompanyBranding(),
      staleTime: 300_000,
    }),
};

export function useCompany(): { company: Company; isLoading: boolean } {
  const { data, isLoading } = useQuery(companyQueries.singleton());
  return { company: data ?? EMPTY_COMPANY, isLoading };
}

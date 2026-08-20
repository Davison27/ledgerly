import { queryOptions, useQuery } from '@tanstack/react-query';
import { fetchCompanyBranding, listCompanyDocumentTypes, listCompanyDocuments } from './company.api';
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

export const companyDocumentTypeQueries = {
  all: ['company-document-types'] as const,
  list: () =>
    queryOptions({
      queryKey: ['company-document-types'] as const,
      queryFn: listCompanyDocumentTypes,
      staleTime: Infinity,
    }),
};

export const companyDocumentQueries = {
  all: ['company-documents'] as const,
  list: (typeId?: string) =>
    queryOptions({
      queryKey: ['company-documents', typeId ?? null] as const,
      queryFn: () => listCompanyDocuments(typeId),
    }),
};

export function useCompany(): { company: Company; isLoading: boolean } {
  const { data, isLoading } = useQuery(companyQueries.singleton());
  return { company: data ?? EMPTY_COMPANY, isLoading };
}

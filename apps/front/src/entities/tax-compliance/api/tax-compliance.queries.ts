import { queryOptions } from '@tanstack/react-query';
import {
  getTaxClientProfile,
  getTaxComplianceSettings,
  listTaxClientProfiles,
  listTaxDeadlines,
  listTaxObligations,
  listTaxSourceStates,
} from './tax-compliance.api';

export const taxComplianceQueries = {
  all: ['tax-compliance'] as const,
  settings: () =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'settings'] as const,
      queryFn: getTaxComplianceSettings,
    }),
  catalog: () =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'catalog'] as const,
      queryFn: listTaxObligations,
    }),
  profiles: () =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'profiles'] as const,
      queryFn: listTaxClientProfiles,
    }),
  profile: (projectId: string) =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'profile', projectId] as const,
      queryFn: () => getTaxClientProfile(projectId),
    }),
  calendar: (from: string, to: string, projectId?: string) =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'calendar', from, to, projectId ?? null] as const,
      queryFn: () => listTaxDeadlines(from, to, projectId),
    }),
  sources: () =>
    queryOptions({
      queryKey: [...taxComplianceQueries.all, 'sources'] as const,
      queryFn: listTaxSourceStates,
    }),
};

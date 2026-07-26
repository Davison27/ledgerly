import { queryOptions } from '@tanstack/react-query';
import { getCompanyDashboard } from './dashboard.api';

export const dashboardQueries = {
  all: ['dashboard'] as const,
  company: (year?: number) =>
    queryOptions({
      queryKey: ['dashboard', 'company', year ?? null] as const,
      queryFn: () => getCompanyDashboard(year),
      staleTime: 0,
    }),
};

import { useQuery } from '@tanstack/react-query';
import { taxComplianceQueries } from '../api/tax-compliance.queries';
import type { TaxDeadlineDto } from '../api/types';

export interface TaxComplianceCalendarState {
  enabled: boolean;
  settingsLoading: boolean;
  deadlines: TaxDeadlineDto[];
  loading: boolean;
  loadError: boolean;
}

export function useTaxComplianceCalendar(
  from: string,
  to: string,
): TaxComplianceCalendarState {
  const {
    data: settings,
    isPending: settingsLoading,
    isError: settingsLoadError,
  } = useQuery(taxComplianceQueries.settings());
  const deadlinesQuery = useQuery({
    ...taxComplianceQueries.calendar(from, to),
    enabled: settings?.enabled === true,
  });
  const deadlines = deadlinesQuery.data ?? [];

  return {
    enabled: settings?.enabled === true,
    settingsLoading,
    deadlines,
    loading: deadlinesQuery.isPending,
    loadError: settingsLoadError || deadlinesQuery.isError,
  };
}

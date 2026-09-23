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
  enabled = true,
): TaxComplianceCalendarState {
  const {
    data: settings,
    isPending: settingsLoading,
    isError: settingsLoadError,
  } = useQuery({
    ...taxComplianceQueries.settings(),
    enabled,
  });
  const deadlinesQuery = useQuery({
    ...taxComplianceQueries.calendar(from, to),
    enabled: enabled && settings?.enabled === true,
  });
  const deadlines = deadlinesQuery.data ?? [];

  return {
    enabled: enabled && settings?.enabled === true,
    settingsLoading: enabled && settingsLoading,
    deadlines,
    loading:
      enabled && (settingsLoading || (settings?.enabled === true && deadlinesQuery.isPending)),
    loadError: enabled && (settingsLoadError || deadlinesQuery.isError),
  };
}

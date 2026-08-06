import { useQuery } from '@tanstack/react-query';
import { taxComplianceQueries } from '../api/tax-compliance.queries';

export function useTaxComplianceCalendar(from: string, to: string) {
  const {
    data: settings,
    isPending: settingsLoading,
    isError: settingsLoadError,
  } = useQuery(taxComplianceQueries.settings());
  const deadlinesQuery = useQuery({
    ...taxComplianceQueries.calendar(from, to),
    enabled: settings?.enabled === true,
  });

  return {
    enabled: settings?.enabled === true,
    settingsLoading,
    deadlines: deadlinesQuery.data ?? [],
    loading: deadlinesQuery.isPending,
    loadError: settingsLoadError || deadlinesQuery.isError,
  };
}

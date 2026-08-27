import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { documentQueries } from '@/entities/document';
import { projectEquipmentQueries } from '@/entities/project-equipment';
import { deriveDashboardData, type DashboardData } from '@/widgets/dashboard-charts';

export interface ProjectFinancialSummary {
  data: DashboardData;
  isPending: boolean;
  isError: boolean;
}

export function useProjectFinancialSummary(projectId: string): ProjectFinancialSummary {
  const documentsQuery = useQuery({
    ...documentQueries.byProject(projectId),
    enabled: Boolean(projectId),
  });
  const equipmentQuery = useQuery({
    ...projectEquipmentQueries.list(projectId),
    enabled: Boolean(projectId),
  });

  const data = useMemo(
    () =>
      deriveDashboardData(
        documentsQuery.data ?? [],
        (equipmentQuery.data ?? []).flatMap((item) =>
          item.leaseExpense !== null && item.leaseExpenseDate
            ? [{ amount: item.leaseExpense, date: item.leaseExpenseDate }]
            : [],
        ),
      ),
    [documentsQuery.data, equipmentQuery.data],
  );

  return {
    data,
    isPending: documentsQuery.isPending || equipmentQuery.isPending,
    isError: documentsQuery.isError || equipmentQuery.isError,
  };
}

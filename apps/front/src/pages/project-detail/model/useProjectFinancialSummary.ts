import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { documentQueries } from '@/entities/document';
import { projectEquipmentQueries } from '@/entities/project-equipment';
import { deriveDashboardData, type DashboardData } from '@/widgets/dashboard-charts';

export interface ProjectFinancialSummary {
  data: DashboardData;
  isPending: boolean;
  isError: boolean;
  isPartial: boolean;
}

export function useProjectFinancialSummary(
  projectId: string,
  canViewDashboard = true,
  canViewDocuments = true,
  canViewEquipment = true,
): ProjectFinancialSummary {
  const documentsEnabled = Boolean(projectId) && canViewDashboard && canViewDocuments;
  const equipmentEnabled = Boolean(projectId) && canViewDashboard && canViewEquipment;
  const documentsQuery = useQuery({
    ...documentQueries.byProject(projectId),
    enabled: documentsEnabled,
  });
  const equipmentQuery = useQuery({
    ...projectEquipmentQueries.list(projectId),
    enabled: equipmentEnabled,
  });

  const data = useMemo(
    () =>
      deriveDashboardData(
        documentsEnabled ? documentsQuery.data ?? [] : [],
        equipmentEnabled ? (equipmentQuery.data ?? []).flatMap((item) => item.leaseExpenses) : [],
      ),
    [documentsEnabled, documentsQuery.data, equipmentEnabled, equipmentQuery.data],
  );

  return {
    data,
    isPending:
      (documentsEnabled && documentsQuery.isPending) ||
      (equipmentEnabled && equipmentQuery.isPending),
    isError:
      (documentsEnabled && documentsQuery.isError) ||
      (equipmentEnabled && equipmentQuery.isError),
    isPartial: !canViewDocuments || !canViewEquipment,
  };
}

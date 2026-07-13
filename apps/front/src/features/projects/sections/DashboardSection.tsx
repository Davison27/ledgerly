import { useMemo } from 'react';
import { Flex } from 'antd';
import type { ProjectSectionProps } from './types';
import { getProjectDocuments } from '../../../data/documents';
import { deriveDashboardData } from './dashboard/data';
import { KpiRow } from './dashboard/KpiRow';

/** Sección de Panel (dashboard) del detalle de proyecto. */
export function DashboardSection({ project }: ProjectSectionProps) {
  const data = useMemo(
    () => deriveDashboardData(getProjectDocuments(project.id)),
    [project.id],
  );

  return (
    <Flex vertical gap={20} style={{ padding: 28 }}>
      <KpiRow
        income={data.income}
        expenses={data.expenses}
        pending={data.pending}
        overdue={data.overdue}
      />
    </Flex>
  );
}

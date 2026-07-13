import { useMemo } from 'react';
import { Flex } from 'antd';
import type { ProjectSectionProps } from './types';
import { getProjectDocuments } from '../../../data/documents';
import { deriveDashboardData } from './dashboard/data';
import { KpiRow } from './dashboard/KpiRow';
import { MonthlyChart } from './dashboard/MonthlyChart';
import { CategoryDonut } from './dashboard/CategoryDonut';
import { StatusBreakdown } from './dashboard/StatusBreakdown';

/** Sección de Panel (dashboard) del detalle de proyecto. */
export function DashboardSection({ project, color }: ProjectSectionProps) {
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

      <MonthlyChart
        income={data.monthlyIncome}
        expenses={data.monthlyExpenses}
        color={color}
      />

      <Flex gap={20} wrap align="stretch">
        <CategoryDonut
          categoryTotals={data.categoryTotals}
          totalDocs={data.totalDocs}
          color={color}
        />
        <StatusBreakdown
          paid={data.paid}
          pending={data.pending}
          overdue={data.overdue}
        />
      </Flex>
    </Flex>
  );
}

import { useMemo } from 'react';
import { Flex } from 'antd';
import type { ProjectSectionProps } from './types';
import { useProjectDocuments } from './documents/useProjectDocuments';
import { deriveDashboardData } from './dashboard/data';
import { KpiRow } from './dashboard/KpiRow';
import { ProfitSummary } from './dashboard/ProfitSummary';
import { MonthlyChart } from './dashboard/MonthlyChart';
import { MonthlyProfitChart } from './dashboard/MonthlyProfitChart';
import { CumulativeProfitChart } from './dashboard/CumulativeProfitChart';
import { MarginTrendChart } from './dashboard/MarginTrendChart';
import { CategoryDonut } from './dashboard/CategoryDonut';
import { StatusBreakdown } from './dashboard/StatusBreakdown';
import { CashflowByStatus } from './dashboard/CashflowByStatus';
import { TopIssuers } from './dashboard/TopIssuers';

export function DashboardSection({ project, color }: ProjectSectionProps) {
  const { documents } = useProjectDocuments(project.id);
  const data = useMemo(() => deriveDashboardData(documents), [documents]);

  return (
    <Flex vertical gap={20} style={{ padding: 28 }}>
      <KpiRow
        income={data.income}
        expenses={data.expenses}
        pending={data.pending}
        overdue={data.overdue}
      />

      <ProfitSummary profit={data.profit} margin={data.margin} />

      <MonthlyChart
        income={data.monthlyIncome}
        expenses={data.monthlyExpenses}
        color={color}
      />

      <Flex gap={20} wrap align="stretch">
        <MonthlyProfitChart profit={data.monthlyProfit} />
        <CumulativeProfitChart cumulativeProfit={data.cumulativeProfit} />
        <MarginTrendChart monthlyMargin={data.monthlyMargin} color={color} />
      </Flex>

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
        <CashflowByStatus
          pagado={data.amountByStatus.pagado}
          pendiente={data.amountByStatus.pendiente}
          vencido={data.amountByStatus.vencido}
        />
        <TopIssuers topIssuers={data.topIssuers} />
      </Flex>
    </Flex>
  );
}

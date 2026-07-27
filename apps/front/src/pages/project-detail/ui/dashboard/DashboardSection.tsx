import { useMemo } from 'react';
import { Flex } from 'antd';
import type { ProjectSectionProps } from '../../model/types';
import { PageContainer } from '@/shared/ui/PageContainer';
import { useProjectDocuments } from '../../model/useProjectDocuments';
import {
  deriveDashboardData,
  KpiRow,
  MonthlyChart,
  MonthlyProfitChart,
  CumulativeProfitChart,
  MarginTrendChart,
  CategoryDonut,
  StatusBreakdown,
  CashflowByStatus,
  TopIssuers,
} from '@/widgets/dashboard-charts';

export function DashboardSection({ project, color }: ProjectSectionProps) {
  const { documents } = useProjectDocuments(project.id);
  const data = useMemo(() => deriveDashboardData(documents), [documents]);

  return (
    <PageContainer>
      <Flex vertical gap={12}>
        <KpiRow
          income={data.income}
          expenses={data.expenses}
          pending={data.pending}
          overdue={data.overdue}
          profit={data.profit}
          margin={data.margin}
        />

        <Flex gap={12} wrap align="stretch">
          <MonthlyChart
            income={data.monthlyIncome}
            expenses={data.monthlyExpenses}
            color={color}
          />
          <MonthlyProfitChart profit={data.monthlyProfit} />
          <CumulativeProfitChart cumulativeProfit={data.cumulativeProfit} />
          <MarginTrendChart monthlyMargin={data.monthlyMargin} color={color} />
        </Flex>

        <Flex gap={12} wrap align="stretch">
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
    </PageContainer>
  );
}

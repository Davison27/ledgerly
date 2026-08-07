import { useMemo } from 'react';
import { Flex } from 'antd';
import type { ProjectSectionProps } from '../../model/types';
import { PageContainer } from '@/shared/ui/PageContainer';
import { useProjectDocuments } from '../../model/useProjectDocuments';
import { projectProductQueries } from '@/entities/project-product';
import { useQuery } from '@tanstack/react-query';
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
import styles from './DashboardSection.module.css';

export function DashboardSection({ project, color }: ProjectSectionProps) {
  const { documents } = useProjectDocuments(project.id);
  const { data: products = [] } = useQuery(projectProductQueries.list(project.id));
  const data = useMemo(() => deriveDashboardData(documents, products.flatMap((product) => product.leaseExpense !== null && product.leaseExpenseDate ? [{ amount: product.leaseExpense, date: product.leaseExpenseDate }] : [])), [documents, products]);

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

        <div className={styles.chartsGrid}>
          <MonthlyChart
            income={data.monthlyIncome}
            expenses={data.monthlyExpenses}
            color={color}
          />
          <MonthlyProfitChart profit={data.monthlyProfit} />
          <CumulativeProfitChart cumulativeProfit={data.cumulativeProfit} />
          <MarginTrendChart monthlyMargin={data.monthlyMargin} color={color} />
        </div>

        <div className={styles.chartsGrid}>
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
        </div>
      </Flex>
    </PageContainer>
  );
}

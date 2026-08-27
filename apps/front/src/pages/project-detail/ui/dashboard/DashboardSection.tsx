import { Flex } from 'antd';
import { PageContainer } from '@/shared/ui/PageContainer';
import {
  KpiRow,
  MonthlyChart,
  MonthlyProfitChart,
  CumulativeProfitChart,
  MarginTrendChart,
  CategoryDonut,
  StatusBreakdown,
  CashflowByStatus,
  TopIssuers,
  type DashboardData,
} from '@/widgets/dashboard-charts';
import styles from './DashboardSection.module.css';

interface DashboardSectionProps {
  color: string;
  data: DashboardData;
}

export function DashboardSection({ color, data }: DashboardSectionProps) {

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

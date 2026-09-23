import { Alert, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
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
  isPartial: boolean;
}

export function DashboardSection({ color, data, isPartial }: DashboardSectionProps) {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <Flex vertical gap={12}>
        {isPartial && <Alert type="info" showIcon message={t('projects.dashboard.limitedData')} />}
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
            paid={data.amountByStatus.paid}
            pending={data.amountByStatus.pending}
            overdue={data.amountByStatus.overdue}
          />
          <TopIssuers topIssuers={data.topIssuers} />
        </div>
      </Flex>
    </PageContainer>
  );
}

import { useMemo, useState } from 'react';
import { Alert, Button, Card, Collapse, Divider, Empty, Flex, Select, Skeleton, Typography, theme } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  LineChartOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/entities/company';
import { SPACE } from '@/shared/config/theme';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { dashboardQueries } from '../../api/dashboard.queries';
import {
  MonthlyChart,
  MonthlyProfitChart,
  CumulativeProfitChart,
  MarginTrendChart,
  CategoryDonut,
  StatusBreakdown,
  CashflowByStatus,
  TopIssuers,
  formatPct,
} from '@/widgets/dashboard-charts';
import { TopProjectsCard } from '../topProjects/TopProjectsCard';
import { UpcomingScheduleCard } from '../upcoming/UpcomingScheduleCard';
import { TipsPanel } from '../tips/TipsPanel';
import { deriveTips } from '../../model/tips';
import { BudgetVsActualCard } from '../budget/BudgetVsActualCard';
import { VatByQuarterCard } from '../vat/VatByQuarterCard';
import { CashflowForecastCard } from '../cashflow/CashflowForecastCard';
import { KpiCard, type KpiCardProps } from '../kpi/KpiCard';
import { computeKpiDelta } from '../../model/kpis';
import { resolveGreetingPeriod } from '../../model/greeting';
import dashboard from '../dashboard.module.css';
import styles from './DashboardPage.module.css';

const { Title, Text } = Typography;
const { useToken } = theme;

type SkeletonVariant = 'kpi' | 'wide' | 'card';

function SkeletonCard({
  variant = 'card',
  rows = 3,
}: {
  variant?: SkeletonVariant;
  rows?: number;
}) {
  const skeletonClass = variant === 'wide' ? styles.skeletonWide : dashboard.card;

  return (
    <Card className={skeletonClass}>
      <Skeleton active title paragraph={{ rows }} />
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { company } = useCompany();
  const { token } = useToken();

  const [year, setYear] = useState<number | undefined>(undefined);
  const {
    data,
    isPending: loading,
    isError: error,
  } = useQuery(dashboardQueries.company(year));

  const tips = useMemo(() => (data ? deriveTips(data) : []), [data]);

  const greetingName = company.name?.trim() || t('common.appName');
  const greetingPeriod = useMemo(() => resolveGreetingPeriod(), []);
  const isEmpty = !!data && (data.projectCount === 0 || data.totalDocuments === 0);
  const selectedYear = year ?? data?.year;
  const yearOptions = (data?.availableYears ?? (selectedYear ? [selectedYear] : [])).map((y) => ({
    value: y,
    label: String(y),
  }));

  const kpis: KpiCardProps[] = data
    ? [
        {
          label: t('projects.dashboard.kpi.income'),
          value: <Amount value={data.income} tone="income" />,
          icon: <ArrowDownOutlined />,
          tone: 'income',
          series: data.monthlyIncome,
          delta: computeKpiDelta(data.income, data.previousYear?.income, true),
        },
        {
          label: t('projects.dashboard.kpi.expenses'),
          value: <Amount value={data.expenses} tone="expense" />,
          icon: <ArrowUpOutlined />,
          tone: 'expense',
          series: data.monthlyExpenses,
          delta: computeKpiDelta(data.expenses, data.previousYear?.expenses, false),
        },
        {
          label: t('projects.dashboard.profit.net'),
          value: <Amount value={data.profit} tone="auto" />,
          icon: <LineChartOutlined />,
          tone: 'auto',
          series: data.cumulativeProfit,
          delta: computeKpiDelta(data.profit, data.previousYear?.profit, true),
        },
        {
          label: t('projects.dashboard.profit.margin'),
          value: <Numeric>{formatPct(data.margin)}</Numeric>,
          icon: <PercentageOutlined />,
          tone: 'neutral',
          series: data.monthlyMargin,
          delta: computeKpiDelta(data.margin, data.previousYear?.margin, true),
        },
      ]
    : [];

  return (
    <PageContainer>
      <PageHeader
        title={t(`dashboard.greeting.${greetingPeriod}`, { name: greetingName })}
        subtitle={t('dashboard.subtitle')}
        actions={
          data && (
            <Select
              value={selectedYear}
              options={yearOptions}
              className={styles.yearSelect}
              onChange={(value: number) => setYear(value)}
              aria-label={t('dashboard.yearSelector.label')}
            />
          )
        }
      />

      {loading && (
        <Flex vertical gap={SPACE.lg}>
          <div className={styles.kpiGrid}>
            <SkeletonCard variant="kpi" rows={2} />
            <SkeletonCard variant="kpi" rows={2} />
            <SkeletonCard variant="kpi" rows={2} />
            <SkeletonCard variant="kpi" rows={2} />
          </div>
          <div className={styles.cardGrid}>
            <SkeletonCard variant="wide" rows={6} />
            <SkeletonCard variant="card" rows={6} />
          </div>
          <div className={styles.cardGrid}>
            <SkeletonCard rows={4} />
            <SkeletonCard rows={4} />
            <SkeletonCard rows={4} />
          </div>
        </Flex>
      )}

      {!loading && error && (
        <Alert type="error" showIcon message={t('dashboard.loadError')} />
      )}

      {!loading && !error && data && isEmpty && (
        <Flex vertical gap={SPACE.lg}>
          <Card>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Flex vertical gap={4} align="center">
                  <Text strong>{t('dashboard.empty.title')}</Text>
                  <Text type="secondary">{t('dashboard.empty.description')}</Text>
                </Flex>
              }
            >
              <Button type="primary" onClick={() => void navigate({ to: '/projects' })}>
                {t('dashboard.empty.cta')}
              </Button>
            </Empty>
          </Card>

          <TipsPanel tips={tips} />
        </Flex>
      )}

      {!loading && !error && data && !isEmpty && (
        <>
          <Flex vertical gap={SPACE.lg}>
            <div className={styles.kpiGrid}>
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </div>

            <div className={styles.cardGrid}>
              <MonthlyChart
                income={data.monthlyIncome}
                expenses={data.monthlyExpenses}
                color={token.colorPrimary}
              />
              <StatusBreakdown
                paid={data.paidCount}
                pending={data.pendingCount}
                overdue={data.overdueCount}
              />
            </div>

            <div className={styles.cardGrid}>
              <TopProjectsCard topProjects={data.topProjects} />
              <TopIssuers topIssuers={data.topIssuers} />
              <UpcomingScheduleCard />
            </div>
          </Flex>

          <div className={styles.detailSection}>
            <Divider className={styles.detailDivider} />
            <Collapse
              ghost
              defaultActiveKey={['detail']}
              items={[
                {
                  key: 'detail',
                  label: (
                    <Title level={4} className={styles.detailTitle}>
                      {t('dashboard.detail.title')}
                    </Title>
                  ),
                  children: (
                    <Flex vertical gap={SPACE.lg}>
                      <div className={styles.cardGrid}>
                        <CategoryDonut
                          categoryTotals={data.categoryTotals}
                          totalDocs={data.totalDocuments}
                          color={token.colorPrimary}
                        />
                        <CashflowByStatus
                          pagado={data.amountByStatus.pagado}
                          pendiente={data.amountByStatus.pendiente}
                          vencido={data.amountByStatus.vencido}
                        />
                        <MonthlyProfitChart profit={data.monthlyProfit} />
                        <CumulativeProfitChart cumulativeProfit={data.cumulativeProfit} />
                        <MarginTrendChart
                          monthlyMargin={data.monthlyMargin}
                          color={token.colorPrimary}
                        />
                      </div>

                      <div className={styles.cardGrid}>
                        <BudgetVsActualCard budgetVsActual={data.budgetVsActual} />
                        <VatByQuarterCard vatByQuarter={data.vatByQuarter} />
                      </div>

                      <div className={styles.cardGrid}>
                        <CashflowForecastCard cashflowForecast={data.cashflowForecast} />
                        <TipsPanel tips={tips} />
                      </div>
                    </Flex>
                  ),
                },
              ]}
            />
          </div>
        </>
      )}
    </PageContainer>
  );
}

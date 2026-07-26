import { useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Flex, Select, Skeleton, Typography, theme } from 'antd';
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
import { dashboardQueries } from '../api/dashboard.queries';
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
import { TopProjectsCard } from './TopProjectsCard';
import { UpcomingScheduleCard } from './UpcomingScheduleCard';
import { TipsPanel } from './TipsPanel';
import { deriveTips } from '../model/tips';
import { BudgetVsActualCard } from './BudgetVsActualCard';
import { VatByQuarterCard } from './VatByQuarterCard';
import { CashflowForecastCard } from './CashflowForecastCard';
import { KpiCard, type KpiCardProps } from './KpiCard';
import { computeKpiDelta } from '../model/kpis';
import { resolveGreetingPeriod } from '../model/greeting';

const { Title, Text } = Typography;
const { useToken } = theme;

function SkeletonCard({
  flex = '1 1 320px',
  minWidth = 300,
  rows = 3,
}: {
  flex?: string;
  minWidth?: number;
  rows?: number;
}) {
  return (
    <Card style={{ flex, minWidth }}>
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
            <Flex vertical gap={4} align="flex-end">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.yearSelector.label')}
              </Text>
              <Select
                size="small"
                value={selectedYear}
                options={yearOptions}
                style={{ width: 110 }}
                onChange={(value: number) => setYear(value)}
                aria-label={t('dashboard.yearSelector.label')}
              />
            </Flex>
          )
        }
      />

      <Flex vertical gap={SPACE.lg}>
        {loading && (
          <>
            <Flex gap={SPACE.lg} wrap align="stretch">
              <SkeletonCard flex="1 1 220px" minWidth={220} rows={2} />
              <SkeletonCard flex="1 1 220px" minWidth={220} rows={2} />
              <SkeletonCard flex="1 1 220px" minWidth={220} rows={2} />
              <SkeletonCard flex="1 1 220px" minWidth={220} rows={2} />
            </Flex>
            <Flex gap={SPACE.lg} wrap align="stretch">
              <SkeletonCard flex="2 1 480px" minWidth={360} rows={6} />
              <SkeletonCard flex="1 1 320px" minWidth={300} rows={6} />
            </Flex>
            <Flex gap={SPACE.lg} wrap align="stretch">
              <SkeletonCard rows={4} />
              <SkeletonCard rows={4} />
              <SkeletonCard rows={4} />
            </Flex>
          </>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={t('dashboard.loadError')} />
        )}

        {!loading && !error && data && isEmpty && (
          <>
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
          </>
        )}

        {!loading && !error && data && !isEmpty && (
          <>
            <Flex gap={SPACE.lg} wrap align="stretch">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </Flex>

            <Flex gap={SPACE.lg} wrap align="stretch">
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
            </Flex>

            <Flex gap={SPACE.lg} wrap align="stretch">
              <TopProjectsCard topProjects={data.topProjects} />
              <TopIssuers topIssuers={data.topIssuers} />
              <UpcomingScheduleCard />
            </Flex>

            <div>
              <Title level={4} style={{ marginBottom: SPACE.md }}>
                {t('dashboard.detail.title')}
              </Title>

              <Flex vertical gap={SPACE.lg}>
                <Flex gap={SPACE.lg} wrap align="stretch">
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
                </Flex>

                <Flex gap={SPACE.lg} wrap align="stretch">
                  <BudgetVsActualCard budgetVsActual={data.budgetVsActual} />
                  <VatByQuarterCard vatByQuarter={data.vatByQuarter} />
                </Flex>

                <Flex gap={SPACE.lg} wrap align="stretch">
                  <CashflowForecastCard cashflowForecast={data.cashflowForecast} />
                  <TipsPanel tips={tips} />
                </Flex>
              </Flex>
            </div>
          </>
        )}
      </Flex>
    </PageContainer>
  );
}

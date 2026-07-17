import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Flex, Spin, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useCompany } from '../../app/providers/CompanyProvider';
import { getCompanyDashboard } from '../../data/api/dashboard.api';
import type { CompanyDashboardDto } from '../../data/api/types';
import { KpiRow } from '../projects/sections/dashboard/KpiRow';
import { MonthlyChart } from '../projects/sections/dashboard/MonthlyChart';
import { MonthlyProfitChart } from '../projects/sections/dashboard/MonthlyProfitChart';
import { CumulativeProfitChart } from '../projects/sections/dashboard/CumulativeProfitChart';
import { MarginTrendChart } from '../projects/sections/dashboard/MarginTrendChart';
import { CategoryDonut } from '../projects/sections/dashboard/CategoryDonut';
import { StatusBreakdown } from '../projects/sections/dashboard/StatusBreakdown';
import { CashflowByStatus } from '../projects/sections/dashboard/CashflowByStatus';
import { TopIssuers } from '../projects/sections/dashboard/TopIssuers';
import { TopProjectsCard } from './TopProjectsCard';
import { TipsPanel } from './TipsPanel';
import { deriveTips } from './tips';

const { Title, Text } = Typography;
const { useToken } = theme;

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { company } = useCompany();
  const { token } = useToken();

  const [data, setData] = useState<CompanyDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getCompanyDashboard()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tips = useMemo(() => (data ? deriveTips(data) : []), [data]);

  const greetingName = company.name?.trim() || t('common.appName');
  const isEmpty = !!data && (data.projectCount === 0 || data.totalDocuments === 0);

  return (
    <Flex vertical gap={16} style={{ padding: 24 }}>
      <Flex vertical gap={4}>
        <Title level={3} style={{ margin: 0 }}>
          {t('dashboard.greeting', { name: greetingName })}
        </Title>
        <Text type="secondary">{t('dashboard.subtitle')}</Text>
      </Flex>

      {loading && (
        <Flex justify="center" align="center" style={{ padding: 48 }}>
          <Spin size="large" />
        </Flex>
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
          <KpiRow
            income={data.income}
            expenses={data.expenses}
            pending={data.pendingCount}
            overdue={data.overdueCount}
            profit={data.profit}
            margin={data.margin}
          />

          <Flex gap={12} wrap align="stretch">
            <MonthlyChart
              income={data.monthlyIncome}
              expenses={data.monthlyExpenses}
              color={token.colorPrimary}
            />
            <MonthlyProfitChart profit={data.monthlyProfit} />
            <CumulativeProfitChart cumulativeProfit={data.cumulativeProfit} />
            <MarginTrendChart
              monthlyMargin={data.monthlyMargin}
              color={token.colorPrimary}
            />
          </Flex>

          <Flex gap={12} wrap align="stretch">
            <CategoryDonut
              categoryTotals={data.categoryTotals}
              totalDocs={data.totalDocuments}
              color={token.colorPrimary}
            />
            <StatusBreakdown
              paid={data.paidCount}
              pending={data.pendingCount}
              overdue={data.overdueCount}
            />
            <CashflowByStatus
              pagado={data.amountByStatus.pagado}
              pendiente={data.amountByStatus.pendiente}
              vencido={data.amountByStatus.vencido}
            />
            <TopIssuers topIssuers={data.topIssuers} />
          </Flex>

          <Flex gap={12} wrap align="stretch">
            <TopProjectsCard topProjects={data.topProjects} />
            <TipsPanel tips={tips} />
          </Flex>
        </>
      )}
    </Flex>
  );
}

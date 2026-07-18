import { Card, Empty, Flex, Progress, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CompanyDashboardDto } from '../../data/api/types';

const { Text } = Typography;
const { useToken } = theme;

export interface BudgetVsActualCardProps {
  budgetVsActual: CompanyDashboardDto['budgetVsActual'];
}

function formatCurrency(n: number, currency: string): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

export function BudgetVsActualCard({ budgetVsActual }: BudgetVsActualCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  return (
    <Card
      size="small"
      title={t('dashboard.budget.title')}
      style={{ flex: '1 1 420px', minWidth: 320 }}
    >
      {budgetVsActual.length === 0 ? (
        <Empty description={t('dashboard.budget.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Flex vertical gap={14}>
          {budgetVsActual.map((entry) => {
            const hasBudget = entry.budget !== null && entry.consumptionPct !== null;
            const pct = hasBudget ? Math.round((entry.consumptionPct as number) * 100) : 0;
            const isOverBudget = hasBudget && pct > 100;

            return (
              <Flex key={entry.projectId} vertical gap={2}>
                <Flex align="center" justify="space-between" gap={12}>
                  <Text ellipsis style={{ flex: '1 1 auto', minWidth: 80 }} title={entry.name}>
                    {entry.name}
                  </Text>
                  {hasBudget ? (
                    <Text
                      strong
                      style={{
                        flex: 'none',
                        fontSize: 12,
                        color: isOverBudget ? token.colorError : token.colorTextSecondary,
                      }}
                    >
                      {t('dashboard.budget.consumed', { pct })}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ flex: 'none', fontSize: 12 }}>
                      {t('dashboard.budget.noBudget')}
                    </Text>
                  )}
                </Flex>

                {hasBudget && (
                  <Progress
                    percent={Math.min(100, pct)}
                    showInfo={false}
                    size="small"
                    status={isOverBudget ? 'exception' : 'normal'}
                  />
                )}
                {isOverBudget && (
                  <Text style={{ fontSize: 11, color: token.colorError }}>
                    {t('dashboard.budget.overBudget')}
                  </Text>
                )}

                <Flex gap={16} wrap>
                  {hasBudget && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('dashboard.budget.budget')}:{' '}
                      {formatCurrency(entry.budget as number, entry.currency)}
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('dashboard.budget.income')}: {formatCurrency(entry.income, entry.currency)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('dashboard.budget.spent')}: {formatCurrency(entry.expenses, entry.currency)}
                  </Text>
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

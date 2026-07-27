import { Card, Empty, Flex, Progress, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CompanyDashboardDto } from '../api/types';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import typography from '@/shared/ui/typography.module.css';
import { vividOverdue } from '@/widgets/dashboard-charts';
import dashboard from './dashboard.module.css';
import styles from './BudgetVsActualCard.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface BudgetVsActualCardProps {
  budgetVsActual: CompanyDashboardDto['budgetVsActual'];
}

export function BudgetVsActualCard({ budgetVsActual }: BudgetVsActualCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const overdueVivid = vividOverdue(colors.mode);

  return (
    <Card size="small" title={t('dashboard.budget.title')} className={dashboard.wideCard}>
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
                  <Text ellipsis className={styles.name} title={entry.name}>
                    {entry.name}
                  </Text>
                  {hasBudget ? (
                    <Text
                      strong
                      className={styles.consumed}
                      style={{ color: isOverBudget ? overdueVivid : token.colorTextSecondary }}
                    >
                      {t('dashboard.budget.consumed', { pct })}
                    </Text>
                  ) : (
                    <Text type="secondary" className={`${typography.caption} ${styles.noBudgetLabel}`}>
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
                    strokeColor={isOverBudget ? overdueVivid : token.colorPrimary}
                  />
                )}
                {isOverBudget && (
                  <Text className={styles.overBudgetWarning} style={{ color: overdueVivid }}>
                    {t('dashboard.budget.overBudget')}
                  </Text>
                )}

                <Flex gap={16} wrap>
                  {hasBudget && (
                    <Text type="secondary" className={typography.caption}>
                      {t('dashboard.budget.budget')}:{' '}
                      <Amount value={entry.budget as number} currency={entry.currency} />
                    </Text>
                  )}
                  <Text type="secondary" className={typography.caption}>
                    {t('dashboard.budget.income')}:{' '}
                    <Amount value={entry.income} currency={entry.currency} />
                  </Text>
                  <Text type="secondary" className={typography.caption}>
                    {t('dashboard.budget.spent')}:{' '}
                    <Amount value={entry.expenses} currency={entry.currency} />
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

import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatEur } from './data';

const { Text } = Typography;
const { useToken } = theme;

export interface KpiRowProps {
  income: number;
  expenses: number;
  pending: number;
  overdue: number;
}

export function KpiRow({ income, expenses, pending, overdue }: KpiRowProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const items = [
    {
      key: 'income',
      label: t('projects.dashboard.kpi.income'),
      value: formatEur(income),
      color: token.colorText,
    },
    {
      key: 'expenses',
      label: t('projects.dashboard.kpi.expenses'),
      value: formatEur(expenses),
      color: token.colorText,
    },
    {
      key: 'pending',
      label: t('projects.dashboard.kpi.pending'),
      value: String(pending),
      color: token.colorWarning,
    },
    {
      key: 'overdue',
      label: t('projects.dashboard.kpi.overdue'),
      value: String(overdue),
      color: token.colorError,
    },
  ];

  return (
    <Flex gap={16} wrap>
      {items.map((item) => (
        <Card key={item.key} size="small" style={{ flex: '1 1 180px', minWidth: 180 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {item.label}
          </Text>
          <div
            style={{
              marginTop: 6,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.2,
              color: item.color,
            }}
          >
            {item.value}
          </div>
        </Card>
      ))}
    </Flex>
  );
}

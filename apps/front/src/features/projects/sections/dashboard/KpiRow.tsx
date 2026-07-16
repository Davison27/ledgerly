import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatEur, formatPct } from './data';

const { Text } = Typography;
const { useToken } = theme;

export interface KpiRowProps {
  income: number;
  expenses: number;
  pending: number;
  overdue: number;
  profit: number;
  margin: number;
}

export function KpiRow({ income, expenses, pending, overdue, profit, margin }: KpiRowProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const isProfitable = profit >= 0;
  const profitTone = isProfitable ? token.colorSuccess : token.colorError;

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
    <Flex gap={12} wrap>
      {items.map((item) => (
        <Card key={item.key} size="small" style={{ flex: '1 1 150px', minWidth: 150 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {item.label}
          </Text>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.2,
              color: item.color,
            }}
          >
            {item.value}
          </div>
        </Card>
      ))}

      <Card
        size="small"
        style={{
          flex: '1 1 150px',
          minWidth: 150,
          borderColor: profitTone,
          background: isProfitable ? token.colorSuccessBg : token.colorErrorBg,
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('projects.dashboard.profit.net')}
        </Text>
        <div
          style={{
            marginTop: 4,
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.2,
            color: profitTone,
          }}
        >
          {formatEur(profit)}
        </div>
        <Text style={{ fontSize: 12, color: profitTone }}>
          {t('projects.dashboard.profit.margin')} {formatPct(margin)}
        </Text>
      </Card>
    </Flex>
  );
}

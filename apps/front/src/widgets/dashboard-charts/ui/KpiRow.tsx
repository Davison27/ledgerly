import type { ReactNode } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { TYPE } from '@/shared/config/theme';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { formatPct } from '../model/data';

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
  const colors = useSemanticColors();

  if (income === 0 && expenses === 0) {
    return (
      <Card size="small">
        <EmptyHint icon={<WalletOutlined />} title={t('dashboard.kpi.emptyHint')} />
      </Card>
    );
  }

  const isProfitable = profit >= 0;
  const profitColor = isProfitable ? colors.income : colors.expense;

  const items: { key: string; label: string; icon: ReactNode; value: ReactNode }[] = [
    {
      key: 'income',
      label: t('projects.dashboard.kpi.income'),
      icon: <ArrowDownOutlined />,
      value: <Amount value={income} tone="income" />,
    },
    {
      key: 'expenses',
      label: t('projects.dashboard.kpi.expenses'),
      icon: <ArrowUpOutlined />,
      value: <Amount value={expenses} tone="expense" />,
    },
    {
      key: 'pending',
      label: t('projects.dashboard.kpi.pending'),
      icon: <ClockCircleOutlined />,
      value: <Numeric style={{ color: colors.pending }}>{pending}</Numeric>,
    },
    {
      key: 'overdue',
      label: t('projects.dashboard.kpi.overdue'),
      icon: <ExclamationCircleOutlined />,
      value: <Numeric style={{ color: colors.overdue }}>{overdue}</Numeric>,
    },
  ];

  return (
    <Flex gap={12} wrap>
      {items.map((item) => (
        <Card key={item.key} size="small" style={{ flex: '1 1 150px', minWidth: 150 }}>
          <Flex justify="space-between" align="flex-start">
            <Text style={{ ...TYPE.kpiLabel, color: token.colorTextSecondary }}>
              {item.label}
            </Text>
            <span style={{ fontSize: 18, color: token.colorTextQuaternary, display: 'flex' }}>
              {item.icon}
            </span>
          </Flex>
          <div style={{ marginTop: 4, ...TYPE.kpiValue }}>{item.value}</div>
        </Card>
      ))}

      <Card
        size="small"
        style={{
          flex: '1 1 150px',
          minWidth: 150,
          borderColor: isProfitable ? colors.incomeBorder : colors.expenseBorder,
          borderInlineStart: `3px solid ${profitColor}`,
          background: isProfitable ? colors.incomeBg : colors.expenseBg,
        }}
      >
        <Flex justify="space-between" align="flex-start">
          <Text style={{ ...TYPE.kpiLabel, color: token.colorTextSecondary }}>
            {t('projects.dashboard.profit.net')}
          </Text>
          <span style={{ fontSize: 18, color: token.colorTextQuaternary, display: 'flex' }}>
            <LineChartOutlined />
          </span>
        </Flex>
        <div style={{ marginTop: 4, ...TYPE.kpiValue }}>
          <Amount value={profit} tone="auto" />
        </div>
        <Text style={{ fontSize: 12, color: profitColor }}>
          {t('projects.dashboard.profit.margin')} <Numeric>{formatPct(margin)}</Numeric>
        </Text>
      </Card>
    </Flex>
  );
}

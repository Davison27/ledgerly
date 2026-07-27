import type { CSSProperties, ReactNode } from 'react';
import { Card, Flex, Typography } from 'antd';
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
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import typography from '@/shared/ui/typography.module.css';
import { formatPct } from '../model/data';
import styles from './KpiRow.module.css';

const { Text } = Typography;

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
        <Card key={item.key} size="small" className={styles.card}>
          <Flex justify="space-between" align="flex-start">
            <Text className={`${typography.kpiLabel} ${styles.label}`}>{item.label}</Text>
            <span className={styles.icon}>{item.icon}</span>
          </Flex>
          <div className={`${typography.kpiValue} ${styles.value}`}>{item.value}</div>
        </Card>
      ))}

      <Card
        size="small"
        className={`${styles.card} ${styles.profitCard}`}
        style={
          {
            '--kpi-profit-border-color': isProfitable ? colors.incomeBorder : colors.expenseBorder,
            '--kpi-profit-border-start': profitColor,
            '--kpi-profit-bg': isProfitable ? colors.incomeBg : colors.expenseBg,
          } as CSSProperties
        }
      >
        <Flex justify="space-between" align="flex-start">
          <Text className={`${typography.kpiLabel} ${styles.label}`}>
            {t('projects.dashboard.profit.net')}
          </Text>
          <span className={styles.icon}>
            <LineChartOutlined />
          </span>
        </Flex>
        <div className={`${typography.kpiValue} ${styles.value}`}>
          <Amount value={profit} tone="auto" />
        </div>
        <Text className={styles.margin} style={{ color: profitColor }}>
          {t('projects.dashboard.profit.margin')} <Numeric>{formatPct(margin)}</Numeric>
        </Text>
      </Card>
    </Flex>
  );
}

import type { ReactNode } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { SPACE } from '@/shared/config/theme';
import { Numeric } from '@/shared/ui/Numeric';
import typography from '@/shared/ui/typography.module.css';
import { Sparkline } from './Sparkline';
import styles from './KpiCard.module.css';

const { Text } = Typography;
const { useToken } = theme;

export type KpiTone = 'income' | 'expense' | 'neutral' | 'auto';

export interface KpiCardDelta {
  pct: number;
  positiveIsGood?: boolean;
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: KpiTone;
  delta?: KpiCardDelta;
  series?: number[];
}

function formatDeltaPct(pct: number): string {
  return `${Math.abs(pct * 100).toFixed(1)}%`;
}

export function KpiCard({ label, value, icon, tone, delta, series }: KpiCardProps) {
  const { token } = useToken();
  const colors = useSemanticColors();

  const isFavorable = delta ? (delta.positiveIsGood ?? true) === delta.pct >= 0 : true;
  const resolvedTone = tone === 'auto' ? (isFavorable ? 'income' : 'expense') : tone;

  const pillByTone: Record<Exclude<KpiTone, 'auto'>, { bg: string; fg: string }> = {
    income: { bg: colors.incomeBg, fg: colors.income },
    expense: { bg: colors.expenseBg, fg: colors.expense },
    neutral: { bg: `${token.colorPrimary}14`, fg: token.colorPrimary },
  };

  const pill = pillByTone[resolvedTone];
  const sparklineColor =
    resolvedTone === 'expense'
      ? colors.chartVivid[2]
      : resolvedTone === 'income'
        ? colors.chartVivid[1]
        : colors.chartVivid[0];

  return (
    <Card hoverable className={styles.card}>
      {series && series.length > 0 && (
        <div className={styles.sparkline}>
          <Sparkline data={series} color={sparklineColor} fill={sparklineColor} height={44} strokeWidth={1.5} />
        </div>
      )}

      <Flex vertical gap={SPACE.xs} className={styles.body}>
        <Flex justify="space-between" align="flex-start">
          <Text className={`${typography.kpiLabel} ${styles.label}`}>{label}</Text>
          <span className={styles.iconPill} style={{ background: pill.bg, color: pill.fg }}>
            {icon}
          </span>
        </Flex>

        <div className={typography.kpiValue}>{value}</div>

        {delta && (
          <Text className={styles.delta} style={{ color: isFavorable ? colors.income : colors.overdue }}>
            {delta.pct >= 0 ? '↗' : '↘'} <Numeric>{formatDeltaPct(delta.pct)}</Numeric>
          </Text>
        )}
      </Flex>
    </Card>
  );
}

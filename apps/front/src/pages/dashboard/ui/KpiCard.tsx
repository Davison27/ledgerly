import type { ReactNode } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { SPACE, TYPE } from '@/shared/config/theme';
import { Numeric } from '@/shared/ui/Numeric';
import { Sparkline } from './Sparkline';

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
    <Card
      hoverable
      style={{ flex: '1 1 220px', minWidth: 220, position: 'relative', overflow: 'hidden' }}
    >
      {series && series.length > 0 && (
        <div style={{ position: 'absolute', insetInline: 0, bottom: 0, height: 44, opacity: 0.6 }}>
          <Sparkline data={series} color={sparklineColor} fill={sparklineColor} height={44} strokeWidth={1.5} />
        </div>
      )}

      <Flex vertical gap={SPACE.xs} style={{ position: 'relative' }}>
        <Flex justify="space-between" align="flex-start">
          <Text style={{ ...TYPE.kpiLabel, color: token.colorTextSecondary }}>{label}</Text>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: token.borderRadius,
              background: pill.bg,
              color: pill.fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              flex: 'none',
            }}
          >
            {icon}
          </span>
        </Flex>

        <div style={TYPE.kpiValue}>{value}</div>

        {delta && (
          <Text style={{ fontSize: 12, fontWeight: 600, color: isFavorable ? colors.income : colors.overdue }}>
            {delta.pct >= 0 ? '↗' : '↘'} <Numeric>{formatDeltaPct(delta.pct)}</Numeric>
          </Text>
        )}
      </Flex>
    </Card>
  );
}

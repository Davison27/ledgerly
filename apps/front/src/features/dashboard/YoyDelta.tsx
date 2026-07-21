import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '../../app/theme/useSemanticColors';
import { Numeric } from '../../components/ui/Numeric';

const { Text } = Typography;

export interface YoyDeltaProps {
  /** Current-year value. */
  current: number;
  /** Previous-year value, if known. */
  previous: number | null | undefined;
  /** Whether an increase ('up') or a decrease ('down') is the favorable direction. */
  favorable: 'up' | 'down';
}

/**
 * Compact ▲/▼ % indicator comparing a KPI to the same metric a year ago.
 * Renders an em dash when there is no meaningful baseline (previous <= 0). This
 * fallback is defensive only: `YoyKpiRow` already filters that case upstream
 * and renders `EmptyHint` instead, so it is not reached from there.
 */
export function YoyDelta({ current, previous, favorable }: YoyDeltaProps) {
  const { t } = useTranslation();
  const colors = useSemanticColors();

  const deltaPct = previous && previous > 0 ? (current - previous) / previous : null;

  if (deltaPct === null) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('dashboard.yoy.noData')}
      </Text>
    );
  }

  const isFlat = Math.abs(deltaPct) < 0.001;
  const isIncrease = deltaPct > 0;
  const isFavorable = isFlat ? null : favorable === 'up' ? isIncrease : !isIncrease;

  const color = isFlat ? colors.neutral : isFavorable ? colors.income : colors.overdue;

  const arrow = isFlat ? '→' : isIncrease ? '▲' : '▼';
  const pctLabel = `${Math.abs(deltaPct * 100).toFixed(1)}%`;

  return (
    <Text
      style={{ fontSize: 12, fontWeight: 600, color }}
      aria-label={t('dashboard.yoy.ariaLabel', {
        direction: isIncrease ? t('dashboard.yoy.up') : t('dashboard.yoy.down'),
        pct: pctLabel,
      })}
    >
      {arrow} <Numeric>{pctLabel}</Numeric>
    </Text>
  );
}

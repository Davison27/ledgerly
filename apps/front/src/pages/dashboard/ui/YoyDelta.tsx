import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Numeric } from '@/shared/ui/Numeric';

const { Text } = Typography;

export interface YoyDeltaProps {
  current: number;
  previous: number | null | undefined;
  favorable: 'up' | 'down';
}

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

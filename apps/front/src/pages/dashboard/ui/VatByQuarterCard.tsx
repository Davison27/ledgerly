import { useState } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CompanyDashboardDto } from '../api/types';
import { formatEur } from '@/widgets/dashboard-charts';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import typography from '@/shared/ui/typography.module.css';
import dashboard from './dashboard.module.css';
import styles from './VatByQuarterCard.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface VatByQuarterCardProps {
  vatByQuarter: CompanyDashboardDto['vatByQuarter'];
}

const W = 640;
const H = 170;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 26;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const BAR_GAP = 4;

export function VatByQuarterCard({ vatByQuarter }: VatByQuarterCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hoverQuarter, setHoverQuarter] = useState<number | null>(null);

  const outputColor = colors.chartVivid[1];
  const inputColor = colors.chartVivid[2];

  const max = Math.max(
    1,
    ...vatByQuarter.map((q) => q.outputVat),
    ...vatByQuarter.map((q) => q.inputVat),
  );

  const slotW = PLOT_W / 4;
  const barW = (slotW - BAR_GAP * 3) / 2;

  const x = (i: number, series: 0 | 1) =>
    PAD_L + slotW * i + BAR_GAP + series * (barW + BAR_GAP);
  const barH = (v: number) => (v / max) * PLOT_H;
  const barY = (v: number) => PAD_T + PLOT_H - barH(v);

  const legend = [
    { key: 'output', label: t('dashboard.vat.output'), color: outputColor },
    { key: 'input', label: t('dashboard.vat.input'), color: inputColor },
  ];

  return (
    <Card size="small" title={t('dashboard.vat.title')} className={dashboard.wideCard}>
      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('dashboard.vat.title')}
          className={styles.svg}
        >
          <line
            x1={PAD_L}
            y1={PAD_T + PLOT_H}
            x2={PAD_L + PLOT_W}
            y2={PAD_T + PLOT_H}
            stroke={colors.gridLine}
            strokeWidth={1}
          />

          {vatByQuarter.map((q, i) => {
            const rOut = Math.min(4, Math.max(0, barH(q.outputVat)));
            const rIn = Math.min(4, Math.max(0, barH(q.inputVat)));
            const balanceColor = q.balance >= 0 ? token.colorText : token.colorTextSecondary;
            const isDimmed = hoverQuarter !== null && hoverQuarter !== q.quarter;
            return (
              <g
                key={q.quarter}
                opacity={isDimmed ? 0.45 : 1}
                onMouseEnter={() => setHoverQuarter(q.quarter)}
                onMouseLeave={() => setHoverQuarter(null)}
                className={styles.quarterGroup}
              >
                <rect
                  x={x(i, 0)}
                  y={barY(q.outputVat)}
                  width={barW}
                  height={Math.max(1, barH(q.outputVat))}
                  rx={rOut}
                  ry={rOut}
                  fill={outputColor}
                />
                <rect
                  x={x(i, 1)}
                  y={barY(q.inputVat)}
                  width={barW}
                  height={Math.max(1, barH(q.inputVat))}
                  rx={rIn}
                  ry={rIn}
                  fill={inputColor}
                />
                <text
                  x={PAD_L + slotW * i + slotW / 2}
                  y={16}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={balanceColor}
                  className={typography.numeric}
                >
                  <title>{t('dashboard.vat.balance')}</title>
                  {formatEur(q.balance)}
                </text>
                <text
                  x={PAD_L + slotW * i + slotW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={token.colorTextSecondary}
                >
                  {t(`dashboard.vat.quarters.${q.quarter}`)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <Flex gap={20} className={styles.legend}>
        {legend.map((item) => (
          <Flex key={item.key} align="center" gap={8}>
            <span className={styles.legendSwatch} style={{ background: item.color }} />
            <Text type="secondary" className={typography.caption}>
              {item.label}
            </Text>
          </Flex>
        ))}
      </Flex>

      <Text type="secondary" className={`${typography.caption} ${styles.note}`}>
        {t('dashboard.vat.approxNote')}
      </Text>
    </Card>
  );
}

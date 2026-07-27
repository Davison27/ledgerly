import { useState, type MouseEvent } from 'react';
import { Card, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import typography from '@/shared/ui/typography.module.css';
import dashboardCharts from './dashboardCharts.module.css';
import styles from './MonthlyProfitChart.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface MonthlyProfitChartProps {
  profit: number[];
}

const W = 640;
const H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const BAR_MAX_W = 24;
const GAP = 2;

export function MonthlyProfitChart({ profit }: MonthlyProfitChartProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const months = t('projects.dashboard.monthsShort').split(',');
  const maxAbs = Math.max(1, ...profit.map((v) => Math.abs(v)));

  const slotW = PLOT_W / 12;
  const barW = Math.min(BAR_MAX_W, slotW - GAP * 2);
  const zeroY = PAD_T + PLOT_H / 2;
  const halfH = PLOT_H / 2;

  const x = (i: number) => PAD_L + slotW * i + slotW / 2 - barW / 2;
  const barY = (v: number) => (v >= 0 ? zeroY - (v / maxAbs) * halfH : zeroY);
  const barH = (v: number) => Math.abs(v / maxAbs) * halfH;

  const incomeVivid = colors.chartVivid[1];
  const expenseVivid = colors.chartVivid[2];

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const idx = Math.floor((ratio * W) / slotW);
    setHoverIdx(Math.min(11, Math.max(0, idx)));
  };

  return (
    <Card title={t('projects.dashboard.monthlyProfit.title')} className={dashboardCharts.card}>
      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('projects.dashboard.monthlyProfit.title')}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className={styles.svg}
        >
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={PAD_L + PLOT_W}
            y2={zeroY}
            stroke={colors.gridLine}
            strokeWidth={1}
          />

          {profit.map((v, i) => {
            const isPositive = v >= 0;
            const rMax = Math.min(4, Math.max(0, barH(v)));
            const isHovered = hoverIdx === i;
            return (
              <rect
                key={`bar-${i}`}
                x={x(i)}
                y={barY(v)}
                width={barW}
                height={Math.max(1, barH(v))}
                rx={rMax}
                ry={rMax}
                fill={isPositive ? incomeVivid : expenseVivid}
                opacity={hoverIdx === null || isHovered ? 1 : 0.45}
              />
            );
          })}

          {months.map((m, i) => (
            <text
              key={`m-${i}`}
              x={PAD_L + slotW * i + slotW / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill={token.colorTextSecondary}
            >
              {m}
            </text>
          ))}
        </svg>

        {hoverIdx !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: `${((PAD_L + slotW * hoverIdx + slotW / 2) / W) * 100}%`,
              top: `${(barY(profit[hoverIdx]) / H) * 100}%`,
            }}
          >
            <Text strong className={typography.caption}>
              {months[hoverIdx]}: <Amount value={profit[hoverIdx]} tone="auto" />
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}

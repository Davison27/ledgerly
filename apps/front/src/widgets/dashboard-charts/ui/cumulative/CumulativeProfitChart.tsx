import { useId, useState, type MouseEvent } from 'react';
import { Card, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import typography from '@/shared/ui/typography.module.css';
import dashboardCharts from '../dashboardCharts.module.css';
import styles from './CumulativeProfitChart.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface CumulativeProfitChartProps {
  cumulativeProfit: number[];
}

const W = 640;
const H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export function CumulativeProfitChart({
  cumulativeProfit,
}: CumulativeProfitChartProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId();

  const months = t('projects.dashboard.monthsShort').split(',');
  const min = Math.min(0, ...cumulativeProfit);
  const max = Math.max(0, ...cumulativeProfit, 1);
  const range = max - min || 1;

  const isPositive = cumulativeProfit[cumulativeProfit.length - 1] >= 0;
  const lineColor = isPositive ? colors.chartVivid[1] : colors.chartVivid[2];

  const x = (i: number) => PAD_L + (PLOT_W * i) / 11;
  const y = (v: number) => PAD_T + PLOT_H * (1 - (v - min) / range);
  const zeroY = y(0);

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const areaPath = `M ${x(0)},${zeroY} L ${cumulativeProfit
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(' L ')} L ${x(cumulativeProfit.length - 1)},${zeroY} Z`;

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const chartX = ratio * W;
    const idx = Math.round(((chartX - PAD_L) / PLOT_W) * 11);
    setHoverIdx(Math.min(11, Math.max(0, idx)));
  };

  return (
    <Card
      size="small"
      title={t('projects.dashboard.cumulativeProfit.title')}
      className={dashboardCharts.card}
    >
      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('projects.dashboard.cumulativeProfit.title')}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className={styles.svg}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <line
            x1={PAD_L}
            y1={zeroY}
            x2={PAD_L + PLOT_W}
            y2={zeroY}
            stroke={colors.gridLine}
            strokeWidth={1}
          />

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

          <polyline
            points={toPoints(cumulativeProfit)}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {cumulativeProfit.map((v, i) => (
            <circle
              key={`pt-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={hoverIdx === i ? 4 : 2.5}
              fill={lineColor}
            />
          ))}

          {months.map((m, i) => (
            <text
              key={`m-${i}`}
              x={x(i)}
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
            style={{ left: `${(x(hoverIdx) / W) * 100}%`, top: `${(y(cumulativeProfit[hoverIdx]) / H) * 100}%` }}
          >
            <Text strong className={typography.caption}>
              {months[hoverIdx]}: <Amount value={cumulativeProfit[hoverIdx]} tone="auto" />
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}

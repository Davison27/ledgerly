import { Card, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';

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

  const months = t('projects.dashboard.monthsShort').split(',');
  const min = Math.min(0, ...cumulativeProfit);
  const max = Math.max(0, ...cumulativeProfit, 1);
  const range = max - min || 1;

  const isPositive = cumulativeProfit[cumulativeProfit.length - 1] >= 0;
  const lineColor = isPositive ? colors.income : colors.expense;

  const x = (i: number) => PAD_L + (PLOT_W * i) / 11;
  const y = (v: number) => PAD_T + PLOT_H * (1 - (v - min) / range);
  const zeroY = y(0);

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const areaPath = `M ${x(0)},${zeroY} L ${cumulativeProfit
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(' L ')} L ${x(cumulativeProfit.length - 1)},${zeroY} Z`;

  return (
    <Card
      title={t('projects.dashboard.cumulativeProfit.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('projects.dashboard.cumulativeProfit.title')}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: '100%',
            minWidth: 0,
            maxHeight: 170,
          }}
        >
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={PAD_L + PLOT_W}
            y2={zeroY}
            stroke={token.colorBorder}
            strokeWidth={1}
          />

          <path d={areaPath} fill={lineColor} fillOpacity={0.1} stroke="none" />

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
              r={2.5}
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
      </div>
    </Card>
  );
}

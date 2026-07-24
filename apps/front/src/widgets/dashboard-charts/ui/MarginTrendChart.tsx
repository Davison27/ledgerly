import { useState, type MouseEvent } from 'react';
import { Card, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { TYPE } from '@/shared/config/theme';
import { formatPct } from '../model/data';

const { useToken } = theme;

export interface MarginTrendChartProps {
  monthlyMargin: number[];
  color: string;
}

const W = 640;
const H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export function MarginTrendChart({ monthlyMargin }: MarginTrendChartProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const months = t('projects.dashboard.monthsShort').split(',');
  const min = Math.min(0, ...monthlyMargin);
  const max = Math.max(0, ...monthlyMargin, 0.01);
  const range = max - min || 1;

  const x = (i: number) => PAD_L + (PLOT_W * i) / 11;
  const y = (v: number) => PAD_T + PLOT_H * (1 - (v - min) / range);
  const zeroY = y(0);

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const lastIdx = monthlyMargin.length - 1;
  const lastValue = monthlyMargin[lastIdx];
  const lineColor = lastValue >= 0 ? colors.chartVivid[1] : colors.chartVivid[2];

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const chartX = ratio * W;
    const idx = Math.round(((chartX - PAD_L) / PLOT_W) * 11);
    setHoverIdx(Math.min(11, Math.max(0, idx)));
  };

  return (
    <Card
      title={t('projects.dashboard.marginTrend.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={t('projects.dashboard.marginTrend.title')}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: '100%',
            minWidth: 0,
            maxHeight: 170,
            cursor: 'crosshair',
          }}
        >
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={PAD_L + PLOT_W}
            y2={zeroY}
            stroke={colors.gridLine}
            strokeWidth={1}
          />

          <polyline
            points={toPoints(monthlyMargin)}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {monthlyMargin.map((v, i) => (
            <circle
              key={`pt-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={hoverIdx === i ? 4 : 2.5}
              fill={lineColor}
            />
          ))}

          {hoverIdx !== null && (
            <text
              x={x(hoverIdx)}
              y={y(monthlyMargin[hoverIdx]) - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={token.colorText}
              style={TYPE.numeric}
            >
              {formatPct(monthlyMargin[hoverIdx])}
            </text>
          )}

          {hoverIdx === null && (
            <text
              x={x(lastIdx)}
              y={y(lastValue) - 10}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill={token.colorText}
              style={TYPE.numeric}
            >
              {formatPct(lastValue)}
            </text>
          )}

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

import { useId, useState, type MouseEvent } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';

const { Text } = Typography;
const { useToken } = theme;

export interface MonthlyChartProps {
  income: number[];
  expenses: number[];
  color: string;
}

const W = 640;
const H = 220;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export function MonthlyChart({ income, expenses, color }: MonthlyChartProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const incomeGradientId = useId();
  const expenseGradientId = useId();

  const months = t('projects.dashboard.monthsShort').split(',');
  const max = Math.max(1, ...income, ...expenses);
  const baseY = PAD_T + PLOT_H;

  const x = (i: number) => PAD_L + (PLOT_W * i) / 11;
  const y = (v: number) => PAD_T + PLOT_H * (1 - v / max);

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const toArea = (series: number[]) =>
    `M ${x(0)},${baseY} L ${series
      .map((v, i) => `${x(i)},${y(v)}`)
      .join(' L ')} L ${x(series.length - 1)},${baseY} Z`;

  const incomeVivid = colors.chartVivid[1];
  const expenseVivid = colors.chartVivid[2];

  const legend = [
    { key: 'income', label: t('projects.dashboard.legend.income'), color: incomeVivid },
    { key: 'expenses', label: t('projects.dashboard.legend.expenses'), color: expenseVivid },
  ];

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const chartX = ratio * W;
    const idx = Math.round(((chartX - PAD_L) / PLOT_W) * 11);
    setHoverIdx(Math.min(11, Math.max(0, idx)));
  };

  const tooltipTop =
    hoverIdx !== null ? (Math.min(y(income[hoverIdx]), y(expenses[hoverIdx])) / H) * 100 : 0;

  return (
    <Card
      size="small"
      title={t('projects.dashboard.monthly')}
      style={{ flex: '2 1 480px', minWidth: 360 }}
    >
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: '100%',
            minWidth: 0,
            maxHeight: 240,
            cursor: 'crosshair',
          }}
        >
          <defs>
            <linearGradient id={incomeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={incomeVivid} stopOpacity={0.28} />
              <stop offset="100%" stopColor={incomeVivid} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={expenseGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={expenseVivid} stopOpacity={0.28} />
              <stop offset="100%" stopColor={expenseVivid} stopOpacity={0} />
            </linearGradient>
          </defs>

          <line
            x1={PAD_L}
            y1={baseY}
            x2={PAD_L + PLOT_W}
            y2={baseY}
            stroke={color}
            strokeWidth={1}
          />

          {hoverIdx !== null && (
            <line
              x1={x(hoverIdx)}
              y1={PAD_T}
              x2={x(hoverIdx)}
              y2={baseY}
              stroke={token.colorBorderSecondary}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          <path d={toArea(expenses)} fill={`url(#${expenseGradientId})`} stroke="none" />
          <path d={toArea(income)} fill={`url(#${incomeGradientId})`} stroke="none" />

          <polyline
            points={toPoints(expenses)}
            fill="none"
            stroke={expenseVivid}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={toPoints(income)}
            fill="none"
            stroke={incomeVivid}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {income.map((v, i) => (
            <circle key={`in-${i}`} cx={x(i)} cy={y(v)} r={hoverIdx === i ? 4 : 2.5} fill={incomeVivid} />
          ))}
          {expenses.map((v, i) => (
            <circle key={`ex-${i}`} cx={x(i)} cy={y(v)} r={hoverIdx === i ? 4 : 2.5} fill={expenseVivid} />
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
            style={{
              position: 'absolute',
              left: `${(x(hoverIdx) / W) * 100}%`,
              top: `${tooltipTop}%`,
              transform: 'translate(-50%, -115%)',
              background: token.colorBgElevated,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusSM,
              boxShadow: token.boxShadowSecondary,
              padding: '8px 12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 1,
            }}
          >
            <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
              {months[hoverIdx]}
            </Text>
            <Flex gap={12}>
              <Text style={{ fontSize: 12, color: incomeVivid }}>
                {t('projects.dashboard.legend.income')}: <Amount value={income[hoverIdx]} />
              </Text>
              <Text style={{ fontSize: 12, color: expenseVivid }}>
                {t('projects.dashboard.legend.expenses')}: <Amount value={expenses[hoverIdx]} />
              </Text>
            </Flex>
          </div>
        )}
      </div>

      <Flex gap={20} style={{ marginTop: 8 }}>
        {legend.map((item) => (
          <Flex key={item.key} align="center" gap={8}>
            <span
              style={{
                width: 16,
                height: 3,
                borderRadius: 2,
                background: item.color,
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { useToken } = theme;

export interface MonthlyChartProps {
  income: number[];
  expenses: number[];
  color: string;
}

const W = 1000;
const H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export function MonthlyChart({ income, expenses, color }: MonthlyChartProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const months = t('projects.dashboard.monthsShort').split(',');
  const max = Math.max(1, ...income, ...expenses);

  const x = (i: number) => PAD_L + (PLOT_W * i) / 11;
  const y = (v: number) => PAD_T + PLOT_H * (1 - v / max);

  const toPoints = (series: number[]) =>
    series.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const expensesColor = token.colorTextTertiary;

  const legend = [
    { key: 'income', label: t('projects.dashboard.legend.income'), color },
    {
      key: 'expenses',
      label: t('projects.dashboard.legend.expenses'),
      color: expensesColor,
    },
  ];

  return (
    <Card title={t('projects.dashboard.monthly')}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        preserveAspectRatio="none"
        style={{
          display: 'block',
          width: '100%',
          height: 140,
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke={token.colorBorderSecondary}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        <polyline
          points={toPoints(expenses)}
          fill="none"
          stroke={expensesColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={toPoints(income)}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {income.map((v, i) => (
          <circle key={`in-${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={color} />
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

import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { useToken } = theme;

export interface MonthlyChartProps {
  /** Ingresos por mes (12 valores, enero → diciembre). */
  income: number[];
  /** Gastos por mes (12 valores, enero → diciembre). */
  expenses: number[];
  /** Color de acento de la empresa para la serie de ingresos. */
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

/** Gráfico de líneas SVG: ingresos vs gastos a lo largo de 12 meses. */
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
        width="100%"
        role="img"
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {/* Eje base */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke={token.colorBorderSecondary}
          strokeWidth={1}
        />

        {/* Serie de gastos */}
        <polyline
          points={toPoints(expenses)}
          fill="none"
          stroke={expensesColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Serie de ingresos */}
        <polyline
          points={toPoints(income)}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {income.map((v, i) => (
          <circle key={`in-${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={color} />
        ))}

        {/* Etiquetas de mes */}
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

      <Flex gap={20} style={{ marginTop: 12 }}>
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
            <Text type="secondary" style={{ fontSize: 13 }}>
              {item.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

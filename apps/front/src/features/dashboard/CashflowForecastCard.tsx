import { Card, Empty, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CompanyDashboardDto } from '../../data/api/types';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';

const { Text } = Typography;
const { useToken } = theme;

export interface CashflowForecastCardProps {
  cashflowForecast: CompanyDashboardDto['cashflowForecast'];
}

const W = 640;
const H = 150;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const BAR_MAX_W = 32;
const GAP = 4;

function monthLabel(monthKey: string, monthsShort: string[]): string {
  const idx = Number(monthKey.slice(5, 7)) - 1;
  return monthsShort[idx] ?? monthKey;
}

export function CashflowForecastCard({ cashflowForecast }: CashflowForecastCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();

  const monthsShort = t('projects.dashboard.monthsShort').split(',');
  const { overdue, months } = cashflowForecast;

  const maxAbs = Math.max(1, ...months.map((m) => Math.abs(m.net)));
  const count = Math.max(1, months.length);
  const slotW = PLOT_W / count;
  const barW = Math.min(BAR_MAX_W, slotW - GAP * 2);
  const zeroY = PAD_T + PLOT_H / 2;
  const halfH = PLOT_H / 2;

  const x = (i: number) => PAD_L + slotW * i + slotW / 2 - barW / 2;
  const barY = (v: number) => (v >= 0 ? zeroY - (v / maxAbs) * halfH : zeroY);
  const barH = (v: number) => Math.abs(v / maxAbs) * halfH;

  return (
    <Card
      size="small"
      title={t('dashboard.cashflow.title')}
      style={{ flex: '1 1 420px', minWidth: 320 }}
    >
      <Flex vertical gap={4} style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('dashboard.cashflow.overdue')}
        </Text>
        <Flex gap={16} wrap align="baseline">
          <Text style={{ fontSize: 13 }}>
            {t('dashboard.cashflow.inflow')}: <Amount value={overdue.inflow} tone="income" strong />
          </Text>
          <Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {t('dashboard.cashflow.outflow')}: <Amount value={overdue.outflow} strong />
          </Text>
          <Text style={{ fontSize: 13 }}>
            {t('dashboard.cashflow.net')}: <Amount value={overdue.net} tone="auto" strong />
          </Text>
        </Flex>
      </Flex>

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
        {t('dashboard.cashflow.upcoming')}
      </Text>

      {months.length === 0 ? (
        <Empty description={t('dashboard.cashflow.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            role="img"
            aria-label={t('dashboard.cashflow.title')}
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

            {months.map((m, i) => {
              const isPositive = m.net >= 0;
              const rMax = Math.min(4, Math.max(0, barH(m.net)));
              return (
                <rect
                  key={m.month}
                  x={x(i)}
                  y={barY(m.net)}
                  width={barW}
                  height={Math.max(1, barH(m.net))}
                  rx={rMax}
                  ry={rMax}
                  fill={isPositive ? colors.income : colors.expense}
                />
              );
            })}

            {months.map((m, i) => (
              <text
                key={`m-${m.month}`}
                x={PAD_L + slotW * i + slotW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fill={token.colorTextSecondary}
              >
                {monthLabel(m.month, monthsShort)}
              </text>
            ))}
          </svg>
        </div>
      )}
    </Card>
  );
}

import { Card, Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { MinusCircleOutlined } from '@ant-design/icons';
import type { CompanyDashboardDto } from '../../data/api/types';
import { EmptyHint } from '../../components/ui/EmptyHint';
import { YoyDelta } from './YoyDelta';

const { Text } = Typography;

export interface YoyKpiRowProps {
  data: CompanyDashboardDto;
}

/**
 * Compact strip of YoY deltas for the headline KPIs, sitting under the
 * absolute-value KpiRow. Does not touch KpiRow's props/signature since that
 * component is shared with the per-project dashboard.
 *
 * The empty-state decision lives here, not in `YoyDelta`: a one-line `<Text>`
 * doesn't leave room for `EmptyHint`, so when there is no previous-year
 * baseline this replaces the whole Card body (label included) instead of
 * rendering `YoyDelta`.
 */
export function YoyKpiRow({ data }: YoyKpiRowProps) {
  const { t } = useTranslation();
  const prev = data.previousYear;

  const items: {
    key: string;
    label: string;
    current: number;
    previous: number | null | undefined;
    favorable: 'up' | 'down';
  }[] = [
    {
      key: 'income',
      label: t('projects.dashboard.kpi.income'),
      current: data.income,
      previous: prev?.income,
      favorable: 'up',
    },
    {
      key: 'expenses',
      label: t('projects.dashboard.kpi.expenses'),
      current: data.expenses,
      previous: prev?.expenses,
      favorable: 'down',
    },
    {
      key: 'profit',
      label: t('projects.dashboard.profit.net'),
      current: data.profit,
      previous: prev?.profit,
      favorable: 'up',
    },
    {
      key: 'margin',
      label: t('projects.dashboard.profit.margin'),
      current: data.margin,
      previous: prev?.margin,
      favorable: 'up',
    },
  ];

  return (
    <Flex gap={12} wrap>
      {items.map((item) => {
        const hasBaseline = item.previous != null && item.previous > 0;

        return (
          <Card key={item.key} size="small" style={{ flex: '1 1 220px', minWidth: 220 }}>
            {hasBaseline ? (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.label}
                </Text>
                <Flex align="center" gap={8} style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('dashboard.yoy.label', { year: prev?.year })}
                  </Text>
                  <YoyDelta
                    current={item.current}
                    previous={item.previous}
                    favorable={item.favorable}
                  />
                </Flex>
              </>
            ) : (
              <EmptyHint
                icon={<MinusCircleOutlined />}
                title={t('dashboard.yoy.empty.title')}
                hint={t('dashboard.yoy.empty.hint')}
              />
            )}
          </Card>
        );
      })}
    </Flex>
  );
}

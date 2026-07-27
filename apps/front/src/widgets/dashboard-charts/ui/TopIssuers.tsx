import { useState } from 'react';
import { Card, Empty, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TopIssuer } from '../model/data';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import dashboardCharts from './dashboardCharts.module.css';
import styles from './TopIssuers.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface TopIssuersProps {
  topIssuers: TopIssuer[];
}

export function TopIssuers({ topIssuers }: TopIssuersProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(1, ...topIssuers.map((i) => i.total));
  let namedIndex = 0;

  const rows = topIssuers.map((issuer) => {
    let label: string;
    let color: string;
    if (issuer.key === 'unknown') {
      label = t('projects.dashboard.topIssuers.unknown');
      color = token.colorTextTertiary;
    } else if (issuer.key === 'other') {
      label = t('projects.dashboard.topIssuers.other');
      color = token.colorTextQuaternary;
    } else {
      label = issuer.name ?? issuer.key;
      color = colors.chartSeries[namedIndex % colors.chartSeries.length];
      namedIndex += 1;
    }
    return { ...issuer, label, color };
  });

  return (
    <Card size="small" title={t('projects.dashboard.topIssuers.title')} className={dashboardCharts.card}>
      {rows.length === 0 ? (
        <Empty
          description={t('projects.dashboard.topIssuers.empty')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Flex vertical gap={8}>
          {rows.map((row) => (
            <Flex
              key={row.key}
              align="center"
              gap={12}
              className={styles.row}
              data-hovered={hovered === row.key}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className={styles.swatch} style={{ background: row.color }} />
              <Text ellipsis className={styles.label} title={row.label}>
                {row.label}
              </Text>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ width: `${(row.total / max) * 100}%`, background: row.color }}
                />
              </div>
              <Text strong className={styles.amount}>
                <Amount value={row.total} />
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}

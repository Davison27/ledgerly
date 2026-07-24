import { useState } from 'react';
import { Card, Empty, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TopIssuer } from '../model/data';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';

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
    <Card
      size="small"
      title={t('projects.dashboard.topIssuers.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
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
              style={{
                borderRadius: token.borderRadiusSM,
                padding: '4px 6px',
                marginInline: -6,
                background: hovered === row.key ? token.colorFillTertiary : 'transparent',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: row.color,
                  flex: 'none',
                }}
              />
              <Text
                ellipsis
                style={{ flex: '0 1 140px', minWidth: 80 }}
                title={row.label}
              >
                {row.label}
              </Text>
              <div
                style={{
                  flex: '1 1 auto',
                  height: 10,
                  borderRadius: 5,
                  background: token.colorFillSecondary,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(row.total / max) * 100}%`,
                    height: '100%',
                    borderRadius: 5,
                    background: row.color,
                  }}
                />
              </div>
              <Text
                strong
                style={{ flex: 'none', width: 90, textAlign: 'right' }}
              >
                <Amount value={row.total} />
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}

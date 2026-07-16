import { Card, Empty, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TopIssuer } from './data';
import { formatEur } from './data';

const { Text } = Typography;
const { useToken } = theme;

export interface TopIssuersProps {
  topIssuers: TopIssuer[];
}

// Colorblind-safe categorical palette (dataviz skill reference palette, light-surface
// slots 1-6, validated: worst adjacent CVD ΔE 9.1, worst adjacent normal-vision ΔE 19.6).
const CATEGORICAL_PALETTE = [
  '#2a78d6', // blue
  '#008300', // green
  '#e87ba4', // magenta
  '#eda100', // yellow
  '#1baf7a', // aqua
  '#eb6834', // orange
];

export function TopIssuers({ topIssuers }: TopIssuersProps) {
  const { t } = useTranslation();
  const { token } = useToken();

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
      color = CATEGORICAL_PALETTE[namedIndex % CATEGORICAL_PALETTE.length];
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
            <Flex key={row.key} align="center" gap={12}>
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
                {formatEur(row.total)}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}

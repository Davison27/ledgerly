import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentType } from '../../../../data/documents';
import { useSemanticColors } from '../../../../app/theme/useSemanticColors';
import { Numeric } from '../../../../components/ui/Numeric';

const { Text } = Typography;
const { useToken } = theme;

export interface CategoryDonutProps {
  categoryTotals: Record<DocumentType, number>;
  totalDocs: number;
  color: string;
}

const ORDER: DocumentType[] = ['factura', 'nomina', 'impuesto'];

export function CategoryDonut({
  categoryTotals,
  totalDocs,
  color,
}: CategoryDonutProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();

  const palette: Record<DocumentType, string> = {
    factura: color,
    nomina: colors.chartSeries[1],
    impuesto: colors.chartSeries[2],
  };

  const total = ORDER.reduce((acc, key) => acc + categoryTotals[key], 0);

  let acc = 0;
  const stops = ORDER.map((key) => {
    const start = total > 0 ? (acc / total) * 360 : 0;
    acc += categoryTotals[key];
    const end = total > 0 ? (acc / total) * 360 : 0;
    return `${palette[key]} ${start}deg ${end}deg`;
  });

  const background =
    total > 0
      ? `conic-gradient(${stops.join(', ')})`
      : token.colorFillSecondary;

  return (
    <Card
      size="small"
      title={t('projects.dashboard.category')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      <Flex align="center" gap={28} wrap>
        <div
          style={{
            position: 'relative',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background,
            flex: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 21,
              borderRadius: '50%',
              background: token.colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              {t('projects.dashboard.totalDocs', { count: totalDocs })}
            </Text>
          </div>
        </div>

        <Flex vertical gap={8} style={{ flex: '1 1 auto', minWidth: 120 }}>
          {ORDER.map((key) => {
            const pct = total > 0 ? Math.round((categoryTotals[key] / total) * 100) : 0;
            return (
              <Flex key={key} align="center" gap={8}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: palette[key],
                    flex: 'none',
                  }}
                />
                <Text style={{ flex: '1 1 auto' }}>
                  {t(`projects.documents.types.${key}`)}
                </Text>
                <Text type="secondary">
                  <Numeric>{pct}%</Numeric>
                </Text>
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Card>
  );
}

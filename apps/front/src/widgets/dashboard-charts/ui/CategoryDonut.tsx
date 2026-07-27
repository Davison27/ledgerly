import { useState } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentType } from '@/entities/document';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Numeric } from '@/shared/ui/Numeric';
import dashboardCharts from './dashboardCharts.module.css';
import styles from './CategoryDonut.module.css';

const { Text } = Typography;
const { useToken } = theme;

export interface CategoryDonutProps {
  categoryTotals: Record<DocumentType, number>;
  totalDocs: number;
  color: string;
}

const ORDER: DocumentType[] = ['factura', 'nomina', 'impuesto'];
const DIMMED_ALPHA = '33';

export function CategoryDonut({
  categoryTotals,
  totalDocs,
  color,
}: CategoryDonutProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hovered, setHovered] = useState<DocumentType | null>(null);

  const palette: Record<DocumentType, string> = {
    factura: color,
    nomina: colors.chartVivid[1],
    impuesto: colors.chartVivid[2],
  };

  const total = ORDER.reduce((acc, key) => acc + categoryTotals[key], 0);

  let acc = 0;
  const stops = ORDER.map((key) => {
    const start = total > 0 ? (acc / total) * 360 : 0;
    acc += categoryTotals[key];
    const end = total > 0 ? (acc / total) * 360 : 0;
    const dimmed = hovered !== null && hovered !== key;
    const segmentColor = dimmed ? `${palette[key]}${DIMMED_ALPHA}` : palette[key];
    return `${segmentColor} ${start}deg ${end}deg`;
  });

  const background =
    total > 0
      ? `conic-gradient(${stops.join(', ')})`
      : token.colorFillSecondary;

  return (
    <Card
      size="small"
      title={t('projects.dashboard.category')}
      className={dashboardCharts.card}
    >
      <Flex align="center" gap={28} wrap>
        <div className={styles.ring} style={{ background }}>
          <div className={styles.ringCenter}>
            <Text strong className={styles.ringLabel}>
              {t('projects.dashboard.totalDocs', { count: totalDocs })}
            </Text>
          </div>
        </div>

        <Flex vertical gap={8} className={styles.legendList}>
          {ORDER.map((key) => {
            const pct = total > 0 ? Math.round((categoryTotals[key] / total) * 100) : 0;
            return (
              <Flex
                key={key}
                align="center"
                gap={8}
                className={styles.legendItem}
                data-dimmed={hovered !== null && hovered !== key}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={styles.legendSwatch} style={{ background: palette[key] }} />
                <Text className={styles.legendLabel}>
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

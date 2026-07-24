import { useState } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '@/entities/document';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Numeric } from '@/shared/ui/Numeric';
import { vividOverdue } from '../model/data';

const { Text } = Typography;
const { useToken } = theme;

export interface StatusBreakdownProps {
  paid: number;
  pending: number;
  overdue: number;
}

const ORDER: DocumentStatus[] = ['pagado', 'pendiente', 'vencido'];
const DIMMED_ALPHA = '33';

export function StatusBreakdown({ paid, pending, overdue }: StatusBreakdownProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hovered, setHovered] = useState<DocumentStatus | null>(null);

  const counts: Record<DocumentStatus, number> = {
    pagado: paid,
    pendiente: pending,
    vencido: overdue,
  };
  const palette: Record<DocumentStatus, string> = {
    pagado: colors.chartVivid[1],
    pendiente: colors.chartVivid[3],
    vencido: vividOverdue(colors.mode),
  };

  const total = paid + pending + overdue;

  let acc = 0;
  const stops = ORDER.map((key) => {
    const start = total > 0 ? (acc / total) * 360 : 0;
    acc += counts[key];
    const end = total > 0 ? (acc / total) * 360 : 0;
    const dimmed = hovered !== null && hovered !== key;
    const segmentColor = dimmed ? `${palette[key]}${DIMMED_ALPHA}` : palette[key];
    return `${segmentColor} ${start}deg ${end}deg`;
  });

  const background =
    total > 0 ? `conic-gradient(${stops.join(', ')})` : token.colorFillSecondary;

  return (
    <Card
      size="small"
      title={t('projects.dashboard.statusBreakdown')}
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
            transition: 'background 0.15s ease',
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
              {t('projects.dashboard.totalDocs', { count: total })}
            </Text>
          </div>
        </div>

        <Flex vertical gap={8} style={{ flex: '1 1 auto', minWidth: 120 }}>
          {ORDER.map((key) => {
            const pct = total > 0 ? Math.round((counts[key] / total) * 100) : 0;
            return (
              <Flex
                key={key}
                align="center"
                gap={8}
                style={{ cursor: 'default', opacity: hovered !== null && hovered !== key ? 0.5 : 1 }}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
              >
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
                  {t(`projects.documents.statuses.${key}`)}
                </Text>
                <Text type="secondary">
                  <Numeric>{counts[key]}</Numeric> · <Numeric>{pct}%</Numeric>
                </Text>
              </Flex>
            );
          })}
        </Flex>
      </Flex>
    </Card>
  );
}

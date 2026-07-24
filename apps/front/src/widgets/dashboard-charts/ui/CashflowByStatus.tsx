import { useState } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '@/entities/document';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import { vividOverdue } from '../model/data';

const { Text } = Typography;
const { useToken } = theme;

export interface CashflowByStatusProps {
  pagado: number;
  pendiente: number;
  vencido: number;
}

export function CashflowByStatus({
  pagado,
  pendiente,
  vencido,
}: CashflowByStatusProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const colors = useSemanticColors();
  const [hovered, setHovered] = useState<DocumentStatus | null>(null);

  const rows: { key: DocumentStatus; amount: number; color: string }[] = [
    { key: 'pagado', amount: pagado, color: colors.chartVivid[1] },
    { key: 'pendiente', amount: pendiente, color: colors.chartVivid[3] },
    { key: 'vencido', amount: vencido, color: vividOverdue(colors.mode) },
  ];

  const max = Math.max(1, pagado, pendiente, vencido);

  return (
    <Card
      size="small"
      title={t('projects.dashboard.cashflowByStatus.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
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
            <Text style={{ flex: 'none', width: 90 }}>
              {t(`projects.documents.statuses.${row.key}`)}
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
                  width: `${(row.amount / max) * 100}%`,
                  height: '100%',
                  borderRadius: 5,
                  background: row.color,
                }}
              />
            </div>
            <Text strong style={{ flex: 'none', width: 90, textAlign: 'right' }}>
              <Amount value={row.amount} />
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

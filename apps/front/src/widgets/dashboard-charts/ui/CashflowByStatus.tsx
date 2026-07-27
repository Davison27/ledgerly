import { useState } from 'react';
import { Card, Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '@/entities/document';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import { vividOverdue } from '../model/data';
import dashboardCharts from './dashboardCharts.module.css';
import styles from './CashflowByStatus.module.css';

const { Text } = Typography;

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
      className={dashboardCharts.card}
    >
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
            <Text className={styles.label}>
              {t(`projects.documents.statuses.${row.key}`)}
            </Text>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${(row.amount / max) * 100}%`, background: row.color }}
              />
            </div>
            <Text strong className={styles.amount}>
              <Amount value={row.amount} />
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

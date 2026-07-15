import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '../../../../data/documents';
import { formatEur } from './data';

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

  const rows: { key: DocumentStatus; amount: number; color: string }[] = [
    { key: 'pagado', amount: pagado, color: token.colorSuccess },
    { key: 'pendiente', amount: pendiente, color: token.colorWarning },
    { key: 'vencido', amount: vencido, color: token.colorError },
  ];

  const max = Math.max(1, pagado, pendiente, vencido);

  return (
    <Card
      title={t('projects.dashboard.cashflowByStatus.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      <Flex vertical gap={16}>
        {rows.map((row) => (
          <Flex key={row.key} align="center" gap={12}>
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
              {formatEur(row.amount)}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '../../../../data/documents';

const { Text } = Typography;
const { useToken } = theme;

export interface StatusBreakdownProps {
  paid: number;
  pending: number;
  overdue: number;
}

export function StatusBreakdown({ paid, pending, overdue }: StatusBreakdownProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const rows: { key: DocumentStatus; count: number; color: string }[] = [
    { key: 'pagado', count: paid, color: token.colorSuccess },
    { key: 'pendiente', count: pending, color: token.colorWarning },
    { key: 'vencido', count: overdue, color: token.colorError },
  ];

  const max = Math.max(1, paid, pending, overdue);
  const total = paid + pending + overdue;

  return (
    <Card
      size="small"
      title={t('projects.dashboard.statusBreakdown')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
        {t('projects.dashboard.documentsCount', { count: total })}
      </Text>

      <Flex vertical gap={8}>
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
                  width: `${(row.count / max) * 100}%`,
                  height: '100%',
                  borderRadius: 5,
                  background: row.color,
                }}
              />
            </div>
            <Text strong style={{ flex: 'none', width: 28, textAlign: 'right' }}>
              {row.count}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

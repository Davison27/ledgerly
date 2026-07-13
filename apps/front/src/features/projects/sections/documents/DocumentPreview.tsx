import { Button, Flex, Typography, theme } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProjectDocument } from '../../../../data/documents';
import { formatEUR, useTypeLabel } from './documentFormat';
import { StatusTag } from './documentUi';

const { Text, Title } = Typography;
const { useToken } = theme;

interface DocumentPreviewProps {
  document: ProjectDocument | null;
}

export function DocumentPreview({ document }: DocumentPreviewProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const typeLabel = useTypeLabel();

  if (!document) {
    return (
      <Flex align="center" justify="center" style={{ height: '100%', padding: 24 }}>
        <Text type="secondary" style={{ textAlign: 'center' }}>
          {t('projects.documents.preview.empty')}
        </Text>
      </Flex>
    );
  }

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('projects.documents.columns.type'), value: typeLabel(document.type) },
    { label: t('projects.documents.columns.date'), value: document.date },
    {
      label: t('projects.documents.columns.amount'),
      value: formatEUR(document.amount),
    },
    {
      label: t('projects.documents.columns.status'),
      value: <StatusTag status={document.status} />,
    },
  ];

  return (
    <Flex vertical gap={16} style={{ height: '100%' }}>
      <div>
        <Title level={5} style={{ margin: 0 }}>
          {document.name}
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {typeLabel(document.type)} · {document.date}
        </Text>
      </div>

      {/* Caja de vista previa (placeholder) */}
      <Flex
        align="center"
        justify="center"
        style={{
          minHeight: 200,
          border: `1px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadiusLG,
          color: token.colorTextTertiary,
          background: token.colorFillQuaternary,
        }}
      >
        <Text type="secondary">{t('projects.documents.preview.placeholder')}</Text>
      </Flex>

      {/* Detalles */}
      <Flex vertical gap={8}>
        {rows.map((row) => (
          <Flex key={row.label} align="center" justify="space-between" gap={12}>
            <Text type="secondary">{row.label}</Text>
            <span>{row.value}</span>
          </Flex>
        ))}
      </Flex>

      {/* Acciones */}
      <Flex gap={8} style={{ marginTop: 'auto' }}>
        <Button type="primary" icon={<DownloadOutlined />} block>
          {t('projects.documents.preview.download')}
        </Button>
        <Button icon={<PrinterOutlined />} block>
          {t('projects.documents.preview.print')}
        </Button>
      </Flex>
    </Flex>
  );
}

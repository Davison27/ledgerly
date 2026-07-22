import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Popconfirm, Spin, Typography, theme } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  documentFileUrl,
  formatEUR,
  useTypeLabel,
  DirectionTag,
  StatusTag,
  type ProjectDocument,
} from '@/entities/document';

const { Text, Title } = Typography;
const { useToken } = theme;

interface DocumentDetailProps {
  document: ProjectDocument | null;
  onEdit?: (doc: ProjectDocument) => void;
  onDelete?: (doc: ProjectDocument) => void;
  onGoToProject?: (doc: ProjectDocument) => void;
  deleting?: boolean;
}

type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

function usePdfObjectUrl(document: ProjectDocument | null) {
  const [state, setState] = useState<ViewerState>('idle');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const shouldLoad = !!document?.hasFile;

  useEffect(() => {
    if (!shouldLoad || !document) {
      setState('idle');
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setState('loading');
    setObjectUrl(null);

    fetch(documentFileUrl(document.projectId, document.id))
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldLoad, document?.projectId, document?.id]);

  return { state, objectUrl };
}

export function DocumentDetail({
  document,
  onEdit,
  onDelete,
  onGoToProject,
  deleting,
}: DocumentDetailProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const typeLabel = useTypeLabel();
  const { state: viewerState, objectUrl } = usePdfObjectUrl(document);

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
    {
      label: t('projects.documents.columns.direction'),
      value: <DirectionTag direction={document.direction} />,
    },
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

  if (document.irpfRate != null || document.irpfAmount != null) {
    const irpfParts = [
      document.irpfRate != null ? `${document.irpfRate}%` : null,
      document.irpfAmount != null ? formatEUR(document.irpfAmount) : null,
    ].filter((part): part is string => part !== null);
    rows.push({
      label: t('projects.documents.columns.irpf'),
      value: irpfParts.join(' · '),
    });
  }

  const showRealViewer = !!document.hasFile;

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = window.document.createElement('a');
    link.href = objectUrl;
    link.download = document.fileName ?? document.name;
    link.click();
  };

  const handlePrint = () => {
    if (!objectUrl) return;
    const printWindow = window.open(objectUrl, '_blank');
    printWindow?.addEventListener('load', () => {
      printWindow.print();
    });
  };

  const actionsDisabled = showRealViewer ? viewerState !== 'ready' || !objectUrl : true;

  return (
    <Flex vertical gap={16} style={{ height: '100%' }}>
      <Flex align="flex-start" justify="space-between" gap={8}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {document.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {typeLabel(document.type)} · {document.date}
          </Text>
        </div>
        {(onEdit || onDelete || onGoToProject) && (
          <Flex gap={4} style={{ flex: 'none' }}>
            {onGoToProject && (
              <Button type="text" onClick={() => onGoToProject(document)}>
                {t('projects.documents.detail.goToProject')}
              </Button>
            )}
            {onEdit && (
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label={t('common.edit')}
                onClick={() => onEdit(document)}
              />
            )}
            {onDelete && (
              <Popconfirm
                title={t('projects.documents.delete.confirm.title')}
                description={t('projects.documents.delete.confirm.content', { name: document.name })}
                okText={t('projects.documents.delete.confirm.ok')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(document)}
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  aria-label={t('common.delete')}
                  loading={deleting}
                />
              </Popconfirm>
            )}
          </Flex>
        )}
      </Flex>

      {showRealViewer ? (
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 200,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: token.borderRadiusLG,
            overflow: 'auto',
            background: token.colorFillQuaternary,
          }}
        >
          {viewerState === 'loading' && (
            <Flex
              align="center"
              justify="center"
              gap={8}
              vertical
              style={{ height: '100%', padding: 24 }}
            >
              <Spin />
              <Text type="secondary">{t('projects.documents.preview.viewer.loading')}</Text>
            </Flex>
          )}
          {viewerState === 'error' && (
            <Flex align="center" justify="center" style={{ height: '100%', padding: 24 }}>
              <Alert type="error" showIcon message={t('projects.documents.preview.viewer.error')} />
            </Flex>
          )}
          {viewerState === 'ready' && objectUrl && (
            <iframe
              src={objectUrl}
              title={document.name}
              style={{ width: '100%', height: '100%', minHeight: 400, border: 'none' }}
            />
          )}
        </div>
      ) : (
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
          <Text type="secondary">{t('projects.documents.preview.noFile')}</Text>
        </Flex>
      )}

      <Flex vertical gap={8}>
        {rows.map((row) => (
          <Flex key={row.label} align="center" justify="space-between" gap={12}>
            <Text type="secondary">{row.label}</Text>
            <span>{row.value}</span>
          </Flex>
        ))}
      </Flex>

      <Flex gap={8} style={{ marginTop: 'auto' }}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          block
          disabled={actionsDisabled}
          onClick={handleDownload}
        >
          {t('projects.documents.preview.download')}
        </Button>
        <Button icon={<PrinterOutlined />} block disabled={actionsDisabled} onClick={handlePrint}>
          {t('projects.documents.preview.print')}
        </Button>
      </Flex>
    </Flex>
  );
}

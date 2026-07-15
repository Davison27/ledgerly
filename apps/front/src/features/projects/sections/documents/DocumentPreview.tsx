import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Spin, Typography, theme } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { documentFileUrl } from '../../../../data/api/documents.api';
import type { ProjectDocument } from '../../../../data/documents';
import { formatEUR, useTypeLabel } from './documentFormat';
import { StatusTag } from './documentUi';

const { Text, Title } = Typography;
const { useToken } = theme;

interface DocumentPreviewProps {
  projectId: string;
  document: ProjectDocument | null;
}

type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

function usePdfObjectUrl(projectId: string, document: ProjectDocument | null) {
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

    fetch(documentFileUrl(projectId, document.id))
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
  }, [shouldLoad, projectId, document?.id]);

  return { state, objectUrl };
}

export function DocumentPreview({ projectId, document }: DocumentPreviewProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const typeLabel = useTypeLabel();
  const { state: viewerState, objectUrl } = usePdfObjectUrl(projectId, document);

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
    // Best-effort: some browsers block window.print() until the PDF has rendered.
    printWindow?.addEventListener('load', () => {
      printWindow.print();
    });
  };

  const actionsDisabled = showRealViewer ? viewerState !== 'ready' || !objectUrl : true;

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

import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { companyDocumentFileUrl, type CompanyDocumentDto } from '@/entities/company';
import { Numeric } from '@/shared/ui/Numeric';
import styles from './CompanyDocumentPreview.module.css';

const { Text, Title } = Typography;

type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

interface CompanyDocumentPreviewProps {
  document: CompanyDocumentDto | null;
}

export function CompanyDocumentPreview({ document }: CompanyDocumentPreviewProps) {
  const { t } = useTranslation();
  const documentId = document?.id;
  const [state, setState] = useState<ViewerState>('idle');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setState('idle');
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setState('loading');
    setObjectUrl(null);

    fetch(companyDocumentFileUrl(documentId), { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentId]);

  if (!document) {
    return (
      <Flex align="center" justify="center" className={styles.empty}>
        <Text type="secondary">{t('company.documents.preview.empty')}</Text>
      </Flex>
    );
  }

  const actionsDisabled = state !== 'ready' || !objectUrl;

  const download = () => {
    if (!objectUrl) return;
    const link = window.document.createElement('a');
    link.href = objectUrl;
    link.download = document.fileName;
    link.click();
  };

  const print = () => {
    if (!objectUrl) return;
    const printWindow = window.open(objectUrl, '_blank');
    printWindow?.addEventListener('load', () => printWindow.print());
  };

  return (
    <Flex vertical gap={16} className={styles.root}>
      <div>
        <Title level={5} className={styles.title}>
          {document.name}
        </Title>
        <Text type="secondary">{document.fileName}</Text>
      </div>

      <div className={styles.viewer} aria-busy={state === 'loading'}>
        {state === 'loading' && (
          <Flex align="center" justify="center" vertical gap={8} className={styles.stateFill}>
            <Spin />
            <Text type="secondary">{t('company.documents.preview.loading')}</Text>
          </Flex>
        )}
        {state === 'error' && (
          <Flex align="center" justify="center" className={styles.stateFill}>
            <Alert type="error" showIcon title={t('company.documents.preview.error')} />
          </Flex>
        )}
        {state === 'ready' && objectUrl && (
          <iframe src={objectUrl} title={document.name} className={styles.frame} />
        )}
      </div>

      <Flex vertical gap={8} className={styles.metadata}>
        <Flex justify="space-between" gap={12}>
          <Text type="secondary">{t('company.documents.metadata.issueDate')}</Text>
          <span>
            {document.issueDate ? <Numeric>{document.issueDate}</Numeric> : t('company.documents.metadata.notAvailable')}
          </span>
        </Flex>
        <Flex justify="space-between" gap={12}>
          <Text type="secondary">{t('company.documents.metadata.expiryDate')}</Text>
          <span>
            {document.expiryDate ? <Numeric>{document.expiryDate}</Numeric> : t('company.documents.metadata.notAvailable')}
          </span>
        </Flex>
        <Flex vertical gap={4}>
          <Text type="secondary">{t('company.documents.metadata.notes')}</Text>
          <Text>{document.notes || t('company.documents.metadata.notAvailable')}</Text>
        </Flex>
      </Flex>

      <Flex gap={8} className={styles.footer}>
        <Button
          type="primary"
          block
          icon={<DownloadOutlined />}
          disabled={actionsDisabled}
          onClick={download}
        >
          {t('company.documents.actions.download')}
        </Button>
        <Button block icon={<PrinterOutlined />} disabled={actionsDisabled} onClick={print}>
          {t('company.documents.actions.print')}
        </Button>
      </Flex>
    </Flex>
  );
}

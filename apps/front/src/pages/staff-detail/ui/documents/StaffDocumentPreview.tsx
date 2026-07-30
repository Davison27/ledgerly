import { useEffect, useState } from 'react';
import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { staffDocumentFileUrl, type StaffDocumentDto } from '@/entities/staff-member';
import { Numeric } from '@/shared/ui/Numeric';
import styles from './StaffDocumentPreview.module.css';

const { Text, Title } = Typography;

type ViewerState = 'idle' | 'loading' | 'ready' | 'error';

interface StaffDocumentPreviewProps {
  staffMemberId: string;
  document: StaffDocumentDto | null;
}

export function StaffDocumentPreview({ staffMemberId, document }: StaffDocumentPreviewProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ViewerState>('idle');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (!document) {
      setState('idle');
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setState('loading');
    setObjectUrl(null);

    fetch(staffDocumentFileUrl(staffMemberId, document.id), { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setIsImage(blob.type.startsWith('image/'));
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [staffMemberId, document?.id]);

  if (!document) {
    return (
      <Flex align="center" justify="center" className={styles.empty}>
        <Text type="secondary">{t('projects.documents.preview.empty')}</Text>
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
        <Title level={5} className={styles.title}>{document.name}</Title>
        <Text type="secondary">{document.fileName}</Text>
      </div>

      <div className={styles.viewer}>
        {state === 'loading' && (
          <Flex align="center" justify="center" vertical gap={8} className={styles.stateFill}>
            <Spin />
            <Text type="secondary">{t('projects.documents.preview.viewer.loading')}</Text>
          </Flex>
        )}
        {state === 'error' && (
          <Flex align="center" justify="center" className={styles.stateFill}>
            <Alert type="error" showIcon message={t('projects.documents.preview.viewer.error')} />
          </Flex>
        )}
        {state === 'ready' && objectUrl && (
          isImage ? <img src={objectUrl} alt={document.name} className={styles.image} /> : <iframe src={objectUrl} title={document.name} className={styles.frame} />
        )}
      </div>

      <Flex vertical gap={8} className={styles.metadata}>
        <Flex justify="space-between" gap={12}>
          <Text type="secondary">{t('staff.documents.columns.issueDate')}</Text>
          <Numeric>{document.issueDate}</Numeric>
        </Flex>
        <Flex justify="space-between" gap={12}>
          <Text type="secondary">{t('staff.documents.columns.expiryDate')}</Text>
          <span>{document.expiryDate ? <Numeric>{document.expiryDate}</Numeric> : '—'}</span>
        </Flex>
      </Flex>

      <Flex gap={8} className={styles.footer}>
        <Button type="primary" block icon={<DownloadOutlined />} disabled={actionsDisabled} onClick={download}>
          {t('projects.documents.preview.download')}
        </Button>
        <Button block icon={<PrinterOutlined />} disabled={actionsDisabled} onClick={print}>
          {t('projects.documents.preview.print')}
        </Button>
      </Flex>
    </Flex>
  );
}

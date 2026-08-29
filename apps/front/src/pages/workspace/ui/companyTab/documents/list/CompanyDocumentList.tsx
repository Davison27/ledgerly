import type { ReactNode } from 'react';
import { Alert, Button, Empty, Flex, Popconfirm, Skeleton, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { CompanyDocumentDto } from '@/entities/company';
import { Numeric } from '@/shared/ui/Numeric';
import styles from './CompanyDocumentList.module.css';

const { Text } = Typography;

interface CompanyDocumentListProps {
  documents: CompanyDocumentDto[];
  loading: boolean;
  error: boolean;
  selectedDocumentId: string | null;
  deletingId: string | null;
  emptyAction?: ReactNode;
  onRetry: () => void;
  onSelect: (documentId: string) => void;
  onEdit: (document: CompanyDocumentDto) => void;
  onDelete: (document: CompanyDocumentDto) => void;
}

function formatFileSize(bytes: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    bytes / (1024 * 1024),
  );
}

export function CompanyDocumentList({
  documents,
  loading,
  error,
  selectedDocumentId,
  deletingId,
  emptyAction,
  onRetry,
  onSelect,
  onEdit,
  onDelete,
}: CompanyDocumentListProps) {
  const { t, i18n } = useTranslation();

  if (loading) {
    return (
      <div className={styles.state} aria-busy="true" aria-label={t('company.documents.loading')}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.state}>
        <Alert
          type="error"
          showIcon
          title={t('company.documents.loadError')}
          action={<Button onClick={onRetry}>{t('company.documents.retry')}</Button>}
        />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={styles.state}>
        <Empty
          image={<FilePdfOutlined className={styles.emptyIcon} />}
          description={
            <Flex vertical gap={4} align="center">
              <Text>{t('company.documents.empty')}</Text>
              <Text type="secondary">{t('company.documents.emptyHint')}</Text>
            </Flex>
          }
        />
        {emptyAction}
      </div>
    );
  }

  return (
    <ul className={styles.list} aria-label={t('company.documents.listLabel')}>
      {documents.map((document) => {
        const selected = document.id === selectedDocumentId;
        return (
          <li key={document.id} className={`${styles.item} ${selected ? styles.selected : ''}`}>
            <button
              type="button"
              className={styles.documentButton}
              aria-pressed={selected}
              onClick={() => onSelect(document.id)}
            >
              <span className={styles.fileIcon} aria-hidden="true">
                <FilePdfOutlined />
              </span>
              <span className={styles.documentMain}>
                <span className={styles.documentName}>{document.name}</span>
                <span className={styles.fileMeta}>
                  {t('company.documents.metadata.fileMeta', {
                    fileName: document.fileName,
                    size: formatFileSize(document.fileSize, i18n.language),
                  })}
                </span>
              </span>
            </button>

            <div className={styles.metadata}>
              <span>
                <span className={styles.metadataLabel}>{t('company.documents.metadata.issueDate')}</span>
                {document.issueDate ? <Numeric>{document.issueDate}</Numeric> : t('company.documents.metadata.notAvailable')}
              </span>
              <span>
                <span className={styles.metadataLabel}>{t('company.documents.metadata.expiryDate')}</span>
                {document.expiryDate ? <Numeric>{document.expiryDate}</Numeric> : t('company.documents.metadata.notAvailable')}
              </span>
            </div>

            <div className={styles.actions}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                aria-label={t('company.documents.actions.view')}
                onClick={() => onSelect(document.id)}
              />
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label={t('company.documents.actions.edit')}
                onClick={() => onEdit(document)}
              />
              <Popconfirm
                title={t('company.documents.deleteConfirm.title')}
                description={t('company.documents.deleteConfirm.content', { name: document.name })}
                okText={t('company.documents.deleteConfirm.ok')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(document)}
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  aria-label={t('company.documents.actions.delete')}
                  loading={deletingId === document.id}
                />
              </Popconfirm>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

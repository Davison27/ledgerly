import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Alert, Button, Card, Flex, Skeleton, Typography } from 'antd';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  companyDocumentQueries,
  companyDocumentTypeQueries,
  deleteCompanyDocument,
  type CompanyDocumentDto,
} from '@/entities/company';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { companyDocumentTypeTranslationKey } from '../model/companyDocumentLabels';
import { CompanyDocumentEditModal } from '../edit/CompanyDocumentEditModal';
import { CompanyDocumentList } from '../list/CompanyDocumentList';
import { CompanyDocumentPreview } from '../preview/CompanyDocumentPreview';
import { CompanyDocumentUploadModal } from '../upload/CompanyDocumentUploadModal';
import styles from './CompanyDocumentsManager.module.css';

const { Title, Text } = Typography;

export function CompanyDocumentsManager() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: documentTypes = [],
    isPending: typesLoading,
    isError: typesError,
    refetch: refetchTypes,
  } = useQuery(companyDocumentTypeQueries.list());
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<CompanyDocumentDto | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (documentTypes.length === 0) {
      setActiveTypeId(null);
      return;
    }

    if (!activeTypeId || !documentTypes.some((type) => type.id === activeTypeId)) {
      setActiveTypeId(documentTypes[0].id);
    }
  }, [activeTypeId, documentTypes]);

  const {
    data: documents = [],
    isPending: documentsLoading,
    isError: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    ...companyDocumentQueries.list(activeTypeId ?? undefined),
    enabled: Boolean(activeTypeId),
  });

  useEffect(() => {
    if (selectedDocumentId && !documents.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(null);
    }
  }, [documents, selectedDocumentId]);

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  const handleTypeChange = (typeId: string) => {
    setActiveTypeId(typeId);
    setSelectedDocumentId(null);
  };

  const handleDelete = async (document: CompanyDocumentDto) => {
    setDeletingId(document.id);
    try {
      await deleteCompanyDocument(document.id);
      void message.success(t('company.documents.deleted'));
      setSelectedDocumentId((current) => (current === document.id ? null : current));
      await queryClient.invalidateQueries({ queryKey: companyDocumentQueries.all });
    } catch {
      void message.error(t('company.documents.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const openUpload = () => {
    if (activeTypeId) setUploadOpen(true);
  };

  if (typesLoading) {
    return (
      <section className={styles.section} aria-busy="true" aria-label={t('company.documents.loading')}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </section>
    );
  }

  if (typesError) {
    return (
      <section className={styles.section}>
        <Alert
          type="error"
          showIcon
          title={t('company.documents.typesLoadError')}
          action={<Button onClick={() => void refetchTypes()}>{t('company.documents.retry')}</Button>}
        />
      </section>
    );
  }

  if (documentTypes.length === 0) {
    return (
      <section className={styles.section}>
        <Flex align="flex-start" justify="space-between" gap={16} className={styles.sectionHeader}>
          <div>
            <Title level={3} className={styles.title}>
              {t('company.documents.title')}
            </Title>
            <Text type="secondary">{t('company.documents.subtitle')}</Text>
          </div>
        </Flex>
        <EmptyHint icon={<FileTextOutlined />} title={t('company.documents.noTypes')} />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <Flex align="flex-start" justify="space-between" gap={16} className={styles.sectionHeader}>
        <div>
          <Title level={3} className={styles.title}>
            {t('company.documents.title')}
          </Title>
          <Text type="secondary">{t('company.documents.subtitle')}</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openUpload}>
          {t('company.documents.add')}
        </Button>
      </Flex>

      <div className={styles.workspace}>
        <Card className={styles.categoryCard}>
          <nav aria-label={t('company.documents.categoryListLabel')}>
            <ul className={styles.categoryList}>
              {documentTypes.map((type) => {
                const selected = type.id === activeTypeId;
                return (
                  <li key={type.id}>
                    <button
                      type="button"
                      className={`${styles.categoryButton} ${selected ? styles.categorySelected : ''}`}
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => handleTypeChange(type.id)}
                    >
                      {t(`company.documents.types.${companyDocumentTypeTranslationKey(type.code)}`, {
                        defaultValue: type.name,
                      })}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Card>

        <Card className={styles.listCard}>
          <Flex align="center" justify="space-between" gap={12} className={styles.listHeader}>
            <Text strong>
              {activeTypeId
                ? t(`company.documents.types.${companyDocumentTypeTranslationKey(documentTypes.find((type) => type.id === activeTypeId)?.code ?? '')}`, {
                    defaultValue: documentTypes.find((type) => type.id === activeTypeId)?.name,
                  })
                : t('company.documents.title')}
            </Text>
            <Button type="link" icon={<PlusOutlined />} onClick={openUpload}>
              {t('company.documents.add')}
            </Button>
          </Flex>
          <CompanyDocumentList
            documents={documents}
            loading={documentsLoading}
            error={documentsError}
            selectedDocumentId={selectedDocumentId}
            deletingId={deletingId}
            onRetry={() => void refetchDocuments()}
            onSelect={setSelectedDocumentId}
            onEdit={setEditingDocument}
            onDelete={handleDelete}
            emptyAction={
              <Button type="primary" icon={<PlusOutlined />} onClick={openUpload}>
                {t('company.documents.add')}
              </Button>
            }
          />
        </Card>

        <aside className={styles.preview} aria-label={t('company.documents.preview.label')}>
          <CompanyDocumentPreview document={selectedDocument} />
        </aside>
      </div>

      <CompanyDocumentUploadModal
        open={uploadOpen}
        typeId={activeTypeId}
        documentTypes={documentTypes}
        onCancel={() => setUploadOpen(false)}
        onCreated={(createdDocument) => {
          setUploadOpen(false);
          setSelectedDocumentId(createdDocument.id);
        }}
      />
      <CompanyDocumentEditModal
        open={editingDocument !== null}
        document={editingDocument}
        documentTypes={documentTypes}
        onCancel={() => setEditingDocument(null)}
        onUpdated={(updatedDocument) => {
          setEditingDocument(null);
          setSelectedDocumentId(updatedDocument.id);
        }}
      />
    </section>
  );
}

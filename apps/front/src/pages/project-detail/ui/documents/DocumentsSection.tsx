import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Input,
  InputNumber,
  Segmented,
  Select,
  Skeleton,
  Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  deleteDocument,
  documentQueries,
  type DocumentStatus,
  type DocumentType,
  type ProjectDocument,
} from '@/entities/document';
import { projectQueries } from '@/entities/project';
import type { ProjectSectionProps } from '../../model/types';
import { DocumentsListView } from '../documentsList/DocumentsListView';
import { DocumentsCardsView } from '../documentsCards/DocumentsCardsView';
import { DocumentUploadModal } from '@/features/upload-document';
import { useProjectDocuments } from '../../model/useProjectDocuments';
import { DocumentDetail, DocumentEditModal } from '@/features/document-detail';
import styles from './DocumentsSection.module.css';

const { Text } = Typography;

type TypeFilter = DocumentType | 'all';
type StatusFilter = DocumentStatus | 'all';
type LayoutMode = 'list' | 'cards';

export function DocumentsSection({ project, color }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
  } = useProjectDocuments(project.id);

  useEffect(() => {
    if (documentsError) {
      void message.error(t('projects.documents.loadError'));
    }
  }, [documentsError, message, t]);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState<number | null>(null);
  const [amountMax, setAmountMax] = useState<number | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDocumentCreated = () => {
    setUploadOpen(false);
  };

  const handleEdit = (doc: ProjectDocument) => {
    setEditing(doc);
  };

  const handleDocumentUpdated = () => {
    setEditing(null);
  };

  const handleDelete = async (doc: ProjectDocument) => {
    setDeletingId(doc.id);
    try {
      await deleteDocument(project.id, doc.id);
      void message.success(t('projects.documents.delete.deleted'));
      if (selectedId === doc.id) {
        setSelectedId(null);
      }
      await queryClient.invalidateQueries({ queryKey: documentQueries.all });
      await queryClient.invalidateQueries({ queryKey: projectQueries.all });
    } catch {
      void message.error(t('projects.documents.delete.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (q && !doc.name.toLowerCase().includes(q)) return false;
      if (type !== 'all' && doc.type !== type) return false;
      if (status !== 'all' && doc.status !== status) return false;
      if (dateFrom && doc.date < dateFrom) return false;
      if (dateTo && doc.date > dateTo) return false;
      if (amountMin != null && doc.amount < amountMin) return false;
      if (amountMax != null && doc.amount > amountMax) return false;
      return true;
    });
  }, [documents, search, type, status, dateFrom, dateTo, amountMin, amountMax]);

  const count = filtered.length;

  const selectedDoc = useMemo(
    () => documents.find((doc) => doc.id === selectedId) ?? null,
    [documents, selectedId],
  );

  const typeOptions = [
    { value: 'all', label: t('projects.documents.filters.allTypes') },
    { value: 'factura', label: t('projects.documents.types.factura') },
    { value: 'nomina', label: t('projects.documents.types.nomina') },
    { value: 'impuesto', label: t('projects.documents.types.impuesto') },
  ];

  const statusOptions = [
    { value: 'all', label: t('projects.documents.filters.allStatuses') },
    { value: 'pagado', label: t('projects.documents.statuses.pagado') },
    { value: 'pendiente', label: t('projects.documents.statuses.pendiente') },
    { value: 'vencido', label: t('projects.documents.statuses.vencido') },
  ];

  return (
    <Flex className={styles.root}>
      <Flex vertical gap={12} className={styles.main}>
        <Flex wrap gap={8} align="center" className={styles.filterBar}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('projects.documents.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <Select<TypeFilter>
            value={type}
            onChange={setType}
            options={typeOptions}
            className={styles.filterSelect}
          />
          <Select<StatusFilter>
            value={status}
            onChange={setStatus}
            options={statusOptions}
            className={styles.filterSelect}
          />
          <DatePicker
            placeholder={t('projects.documents.filters.dateFrom')}
            format="YYYY-MM-DD"
            onChange={(_, ds) => setDateFrom((ds as string) ?? '')}
          />
          <DatePicker
            placeholder={t('projects.documents.filters.dateTo')}
            format="YYYY-MM-DD"
            onChange={(_, ds) => setDateTo((ds as string) ?? '')}
          />
          <InputNumber
            placeholder={t('projects.documents.filters.amountMin')}
            min={0}
            value={amountMin}
            onChange={setAmountMin}
            className={styles.amountInput}
          />
          <InputNumber
            placeholder={t('projects.documents.filters.amountMax')}
            min={0}
            value={amountMax}
            onChange={setAmountMax}
            className={styles.amountInput}
          />
          <Segmented<LayoutMode>
            value={layout}
            onChange={setLayout}
            options={[
              { value: 'list', label: t('projects.documents.layout.list') },
              { value: 'cards', label: t('projects.documents.layout.cards') },
            ]}
            className={styles.layoutSegmented}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            {t('projects.documents.upload.button')}
          </Button>
        </Flex>

        {!documentsLoading && (
          <Text type="secondary" className={styles.count}>
            {t(count === 1 ? 'projects.documents.countOne' : 'projects.documents.countOther', {
              count,
            })}
          </Text>
        )}

        <div className={styles.list}>
          {documentsLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : documentsError ? (
            <Empty description={t('projects.documents.loadError')} />
          ) : count === 0 ? (
            <Empty description={t('projects.documents.empty')} />
          ) : layout === 'list' ? (
            <DocumentsListView
              documents={filtered}
              selectedId={selectedId}
              onSelect={(doc: ProjectDocument) => setSelectedId(doc.id)}
              color={color}
            />
          ) : (
            <DocumentsCardsView
              documents={filtered}
              selectedId={selectedId}
              onSelect={(doc: ProjectDocument) => setSelectedId(doc.id)}
              color={color}
            />
          )}
        </div>
      </Flex>

      <div className={styles.detail}>
        <DocumentDetail
          document={selectedDoc}
          onEdit={handleEdit}
          onDelete={(doc) => void handleDelete(doc)}
          deleting={selectedDoc != null && deletingId === selectedDoc.id}
        />
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        context={{ kind: 'project', projectId: project.id }}
        onCancel={() => setUploadOpen(false)}
        onCreated={handleDocumentCreated}
      />

      <DocumentEditModal
        open={editing !== null}
        document={editing}
        onCancel={() => setEditing(null)}
        onUpdated={handleDocumentUpdated}
      />
    </Flex>
  );
}

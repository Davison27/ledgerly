import { useEffect, useMemo, useState } from 'react';
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
  Spin,
  Typography,
  theme,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus, DocumentType, ProjectDocument } from '../../../data/documents';
import type { ProjectSectionProps } from './types';
import { DocumentsListView } from './documents/DocumentsListView';
import { DocumentsCardsView } from './documents/DocumentsCardsView';
import { DocumentPreview } from './documents/DocumentPreview';
import { DocumentUploadModal } from './documents/DocumentUploadModal';
import { useProjectDocuments } from './documents/useProjectDocuments';

const { Text } = Typography;
const { useToken } = theme;

type TypeFilter = DocumentType | 'all';
type StatusFilter = DocumentStatus | 'all';
type LayoutMode = 'list' | 'cards';

export function DocumentsSection({ project, color }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const { message } = App.useApp();

  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
    reload: reloadDocuments,
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

  const handleDocumentCreated = () => {
    setUploadOpen(false);
    reloadDocuments();
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
    <Flex style={{ height: '100%' }}>
      <Flex vertical gap={12} style={{ flex: 1, minWidth: 0, height: '100%', padding: 20 }}>
        <Flex wrap gap={8} align="center" style={{ flex: 'none' }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('projects.documents.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Select<TypeFilter>
            value={type}
            onChange={setType}
            options={typeOptions}
            style={{ width: 150 }}
          />
          <Select<StatusFilter>
            value={status}
            onChange={setStatus}
            options={statusOptions}
            style={{ width: 150 }}
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
            style={{ width: 120 }}
          />
          <InputNumber
            placeholder={t('projects.documents.filters.amountMax')}
            min={0}
            value={amountMax}
            onChange={setAmountMax}
            style={{ width: 120 }}
          />
          <Segmented<LayoutMode>
            value={layout}
            onChange={setLayout}
            options={[
              { value: 'list', label: t('projects.documents.layout.list') },
              { value: 'cards', label: t('projects.documents.layout.cards') },
            ]}
            style={{ marginInlineStart: 'auto' }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            {t('projects.documents.upload.button')}
          </Button>
        </Flex>

        {!documentsLoading && (
          <Text type="secondary" style={{ flex: 'none' }}>
            {t(count === 1 ? 'projects.documents.countOne' : 'projects.documents.countOther', {
              count,
            })}
          </Text>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {documentsLoading ? (
            <Flex vertical align="center" justify="center" gap={8} style={{ height: '100%' }}>
              <Spin />
              <Text type="secondary">{t('projects.documents.loading')}</Text>
            </Flex>
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

      <div
        style={{
          flex: 'none',
          width: 360,
          height: '100%',
          padding: 20,
          overflow: 'auto',
          borderInlineStart: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <DocumentPreview document={selectedDoc} />
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        projectId={project.id}
        onCancel={() => setUploadOpen(false)}
        onCreated={handleDocumentCreated}
      />
    </Flex>
  );
}

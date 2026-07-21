import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Flex,
  Input,
  InputNumber,
  Select,
  Spin,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { EyeOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { Dayjs } from 'dayjs';
import { deleteDocument, getDocument, listAllDocuments } from '../../data/api/documents.api';
import { listProjects } from '../../data/api/projects.api';
import { listSuppliers } from '../../data/api/suppliers.api';
import { mapDocumentDto, type ProjectDocument } from '../../data/documents';
import type {
  DocumentDirectionDto,
  DocumentListFiltersDto,
  DocumentListItemDto,
  DocumentStatusDto,
  DocumentTypeDto,
  ProjectSummaryDto,
  SupplierDto,
} from '../../data/api/types';
import { formatEUR, useTypeLabel } from '../projects/sections/documents/documentFormat';
import { DirectionTag, StatusTag } from '../projects/sections/documents/documentUi';
import { DocumentDetail } from './components/DocumentDetail';
import { DocumentEditModal } from './components/DocumentEditModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DOCUMENT_TYPES: DocumentTypeDto[] = ['factura', 'nomina', 'impuesto'];
const DOCUMENT_STATUSES: DocumentStatusDto[] = ['pagado', 'pendiente', 'vencido'];
const DOCUMENT_DIRECTIONS: DocumentDirectionDto[] = ['ingreso', 'gasto'];
const SEARCH_DEBOUNCE_MS = 350;

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

function filterByLabel(input: string, option?: { label?: string }): boolean {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
}

export function DocumentsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const typeLabel = useTypeLabel();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<DocumentTypeDto | undefined>();
  const [status, setStatus] = useState<DocumentStatusDto | undefined>();
  const [direction, setDirection] = useState<DocumentDirectionDto | undefined>();
  const [dateRange, setDateRange] = useState<DateRangeValue>(null);
  const [amountMin, setAmountMin] = useState<number | undefined>();
  const [amountMax, setAmountMax] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();

  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);

  const [documents, setDocuments] = useState<DocumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [editing, setEditing] = useState<ProjectDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce the free-text search so we don't fire a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
    listSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  const filters: DocumentListFiltersDto = useMemo(
    () => ({
      search: search || undefined,
      type,
      status,
      direction,
      dateFrom: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
      dateTo: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
      amountMin,
      amountMax,
      projectId,
      supplierId,
    }),
    [search, type, status, direction, dateRange, amountMin, amountMax, projectId, supplierId],
  );

  const loadDocuments = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listAllDocuments(filters)
      .then(setDocuments)
      .catch(() => {
        setDocuments([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const goToProject = (projectId: string) => {
    void navigate({ to: '/projects/$projectId', params: { projectId } });
  };

  const openDocument = useCallback((record: DocumentListItemDto) => {
    setDrawerOpen(true);
    setSelectedDocument(null);
    setDetailLoading(true);
    setDetailError(false);
    getDocument(record.projectId, record.id)
      .then((dto) => setSelectedDocument(mapDocumentDto(dto)))
      .catch(() => setDetailError(true))
      .finally(() => setDetailLoading(false));
  }, []);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedDocument(null);
    setDetailError(false);
  };

  const handleEdit = (doc: ProjectDocument) => {
    setEditing(doc);
  };

  const handleDocumentUpdated = (updated: ProjectDocument) => {
    setEditing(null);
    setSelectedDocument(updated);
    loadDocuments();
  };

  const handleDelete = async (doc: ProjectDocument) => {
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.projectId, doc.id);
      void message.success(t('projects.documents.delete.deleted'));
      closeDrawer();
      loadDocuments();
    } catch {
      void message.error(t('projects.documents.delete.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<DocumentListItemDto> = [
    {
      title: t('documents.columns.project'),
      dataIndex: 'projectName',
      key: 'projectName',
      width: 180,
      ellipsis: true,
    },
    {
      title: t('documents.columns.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: t('documents.columns.type'),
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (_, record) => typeLabel(record.type),
    },
    {
      title: t('documents.columns.direction'),
      dataIndex: 'direction',
      key: 'direction',
      width: 110,
      render: (_, record) => <DirectionTag direction={record.direction} />,
    },
    {
      title: t('documents.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      title: t('documents.columns.date'),
      dataIndex: 'date',
      key: 'date',
      width: 110,
    },
    {
      title: t('documents.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => formatEUR(amount),
    },
    {
      title: t('documents.columns.issuer'),
      dataIndex: 'issuerName',
      key: 'issuerName',
      ellipsis: true,
      render: (issuerName: string | null) => issuerName || '—',
    },
    {
      title: t('documents.columns.invoiceNumber'),
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 140,
      render: (invoiceNumber: string | null) => invoiceNumber || '—',
    },
    {
      title: t('documents.columns.actions'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Flex gap={4} justify="center">
          <Tooltip title={t('documents.actions.view')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              aria-label={t('documents.actions.view')}
              onClick={(event) => {
                event.stopPropagation();
                openDocument(record);
              }}
            />
          </Tooltip>
          <Tooltip title={t('projects.documents.detail.goToProject')}>
            <Button
              type="text"
              icon={<ExportOutlined />}
              aria-label={t('projects.documents.detail.goToProject')}
              onClick={(event) => {
                event.stopPropagation();
                goToProject(record.projectId);
              }}
            />
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
        {t('documents.title')}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {t('documents.subtitle')}
      </Text>

      <Flex gap={12} wrap style={{ marginBottom: 24 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('documents.filters.search')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          style={{ width: 240 }}
        />
        <Select<DocumentTypeDto>
          allowClear
          placeholder={t('documents.filters.allTypes')}
          value={type}
          onChange={setType}
          style={{ width: 150 }}
          options={DOCUMENT_TYPES.map((value) => ({
            value,
            label: t(`projects.documents.types.${value}`),
          }))}
        />
        <Select<DocumentStatusDto>
          allowClear
          placeholder={t('documents.filters.allStatuses')}
          value={status}
          onChange={setStatus}
          style={{ width: 150 }}
          options={DOCUMENT_STATUSES.map((value) => ({
            value,
            label: t(`projects.documents.statuses.${value}`),
          }))}
        />
        <Select<DocumentDirectionDto>
          allowClear
          placeholder={t('documents.filters.direction')}
          value={direction}
          onChange={setDirection}
          style={{ width: 150 }}
          options={DOCUMENT_DIRECTIONS.map((value) => ({
            value,
            label: t(`projects.documents.directions.${value}`),
          }))}
        />
        <RangePicker
          value={dateRange}
          onChange={(values) => setDateRange(values)}
          format="YYYY-MM-DD"
        />
        <InputNumber
          placeholder={t('documents.filters.amountMin')}
          value={amountMin}
          onChange={(value) => setAmountMin(value ?? undefined)}
          style={{ width: 130 }}
          min={0}
        />
        <InputNumber
          placeholder={t('documents.filters.amountMax')}
          value={amountMax}
          onChange={(value) => setAmountMax(value ?? undefined)}
          style={{ width: 130 }}
          min={0}
        />
        <Select
          allowClear
          showSearch
          placeholder={t('documents.filters.allProjects')}
          value={projectId}
          onChange={setProjectId}
          style={{ width: 200 }}
          filterOption={filterByLabel}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
        <Select
          allowClear
          showSearch
          placeholder={t('documents.filters.allSuppliers')}
          value={supplierId}
          onChange={setSupplierId}
          style={{ width: 200 }}
          filterOption={filterByLabel}
          options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
        />
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('documents.loadError')} />
      ) : documents.length === 0 ? (
        <Empty description={t('documents.empty')} />
      ) : (
        <Table<DocumentListItemDto>
          columns={columns}
          dataSource={documents}
          rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          onRow={(record) => ({
            onClick: () => openDocument(record),
            style: { cursor: 'pointer' },
          })}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={t('documents.detail.title')}
        width="min(900px, 96vw)"
        destroyOnHidden
        styles={{ body: { display: 'flex', flexDirection: 'column' } }}
      >
        {detailLoading ? (
          <Flex justify="center" style={{ padding: '48px 0' }}>
            <Spin />
          </Flex>
        ) : detailError ? (
          <Alert type="error" showIcon message={t('documents.detail.loadError')} />
        ) : (
          <DocumentDetail
            document={selectedDocument}
            onEdit={handleEdit}
            onDelete={(doc) => void handleDelete(doc)}
            onGoToProject={(doc) => goToProject(doc.projectId)}
            deleting={selectedDocument != null && deletingId === selectedDocument.id}
          />
        )}
      </Drawer>

      <DocumentEditModal
        open={editing !== null}
        document={editing}
        onCancel={() => setEditing(null)}
        onUpdated={handleDocumentUpdated}
      />
    </div>
  );
}

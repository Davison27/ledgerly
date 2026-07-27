import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Skeleton,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { EyeOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { Dayjs } from 'dayjs';
import {
  deleteDocument,
  documentQueries,
  useTypeLabel,
  DirectionTag,
  StatusTag,
  type DocumentDirectionDto,
  type DocumentListFiltersDto,
  type DocumentListItemDto,
  type DocumentStatusDto,
  type DocumentTypeDto,
  type ProjectDocument,
} from '@/entities/document';
import { projectQueries } from '@/entities/project';
import { supplierQueries } from '@/entities/supplier';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { DocumentDetail, DocumentEditModal } from '@/features/document-detail';
import styles from './DocumentsPage.module.css';

const { Text } = Typography;
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
  const queryClient = useQueryClient();
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

  const [selected, setSelected] = useState<{ projectId: string; id: string } | null>(null);
  const [editing, setEditing] = useState<ProjectDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: projects = [] } = useQuery(projectQueries.list());
  const { data: suppliers = [] } = useQuery(supplierQueries.list());

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

  const {
    data: documents = [],
    isPending: loading,
    isError: loadError,
  } = useQuery({ ...documentQueries.list(filters), placeholderData: keepPreviousData });

  const {
    data: selectedDocument,
    isPending: detailLoading,
    isError: detailError,
  } = useQuery({
    ...documentQueries.detail(selected?.projectId ?? '', selected?.id ?? ''),
    enabled: selected !== null,
  });

  const goToProject = (projectId: string) => {
    void navigate({ to: '/projects/$projectId', params: { projectId } });
  };

  const openDocument = (record: DocumentListItemDto) => {
    setSelected({ projectId: record.projectId, id: record.id });
  };

  const closeDrawer = () => {
    setSelected(null);
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
      await deleteDocument(doc.projectId, doc.id);
      void message.success(t('projects.documents.delete.deleted'));
      closeDrawer();
      await queryClient.invalidateQueries({ queryKey: documentQueries.all });
      await queryClient.invalidateQueries({ queryKey: projectQueries.all });
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
      render: (date: string) => <Numeric>{date}</Numeric>,
    },
    {
      title: t('documents.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number, record) => (
        <Amount value={amount} tone={record.direction === 'ingreso' ? 'income' : 'expense'} />
      ),
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
    <PageContainer>
      <PageHeader title={t('documents.title')} subtitle={t('documents.subtitle')} />

      <Flex gap={12} wrap className={styles.filterBar}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('documents.filters.search')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className={styles.searchInput}
        />
        <Select<DocumentTypeDto>
          allowClear
          placeholder={t('documents.filters.allTypes')}
          value={type}
          onChange={setType}
          className={styles.filterSelect}
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
          className={styles.filterSelect}
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
          className={styles.filterSelect}
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
          className={styles.amountInput}
          min={0}
        />
        <InputNumber
          placeholder={t('documents.filters.amountMax')}
          value={amountMax}
          onChange={(value) => setAmountMax(value ?? undefined)}
          className={styles.amountInput}
          min={0}
        />
        <Select
          allowClear
          showSearch
          placeholder={t('documents.filters.allProjects')}
          value={projectId}
          onChange={setProjectId}
          className={styles.entitySelect}
          filterOption={filterByLabel}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
        />
        <Select
          allowClear
          showSearch
          placeholder={t('documents.filters.allSuppliers')}
          value={supplierId}
          onChange={setSupplierId}
          className={styles.entitySelect}
          filterOption={filterByLabel}
          options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
        />
      </Flex>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('documents.loadError')} />
      ) : documents.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('documents.empty')} />
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
        open={selected !== null}
        onClose={closeDrawer}
        title={t('documents.detail.title')}
        width="min(900px, 96vw)"
        destroyOnHidden
        classNames={{ body: styles.drawerBody }}
      >
        {detailLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : detailError ? (
          <Alert type="error" showIcon message={t('documents.detail.loadError')} />
        ) : (
          <DocumentDetail
            document={selectedDocument ?? null}
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
    </PageContainer>
  );
}

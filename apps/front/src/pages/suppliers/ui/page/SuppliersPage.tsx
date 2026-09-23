import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  App,
  Alert,
  Button,
  Flex,
  Input,
  Popconfirm,
  Skeleton,
  Switch,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createSupplier,
  deleteSupplier,
  unarchiveSupplier,
  supplierQueries,
  updateSupplier,
  type SupplierDto,
  type SupplierSpendDto,
  type SupplierSummaryDto,
} from '@/entities/supplier';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { TableSurface } from '@/shared/ui/TableSurface';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import { SupplierFormModal, type SupplierFormValues } from '../form/SupplierFormModal';
import styles from './SuppliersPage.module.css';
import {
  isSupplierArchived,
  supplierDeletionMessageKey,
  visibleSuppliers,
} from '../../model/suppliersPage';

const { Text } = Typography;

export function SuppliersPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: suppliers = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(supplierQueries.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('suppliers', 'edit');
  const canViewDocuments = canAccess('documents', 'view');

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const visible = visibleSuppliers(suppliers, showArchived);
    if (!query) return visible;
    return visible.filter((supplier) =>
      [supplier.name, supplier.taxId]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [search, showArchived, suppliers]);

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const handleEdit = (supplier: SupplierDto) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (values: SupplierFormValues) => {
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, values);
        void message.success(t('suppliers.form.updated'));
      } else {
        await createSupplier(values);
        void message.success(t('suppliers.form.created'));
      }
      setIsFormOpen(false);
      setEditingSupplier(null);
      await queryClient.invalidateQueries({ queryKey: supplierQueries.all });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('suppliers.form.duplicateTaxId'));
        return;
      }
      void message.error(
        editingSupplier ? t('suppliers.form.updateError') : t('suppliers.form.createError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplier: SupplierDto) => {
    setDeletingId(supplier.id);
    try {
      const { outcome } = await deleteSupplier(supplier.id);
      void message.success(t(supplierDeletionMessageKey(outcome)));
      await queryClient.invalidateQueries({ queryKey: supplierQueries.all });
    } catch {
      void message.error(t('suppliers.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnarchive = async (supplier: SupplierSummaryDto) => {
    setUnarchivingId(supplier.id);
    try {
      await unarchiveSupplier(supplier.id);
      void message.success(t('suppliers.unarchived'));
      await queryClient.invalidateQueries({ queryKey: supplierQueries.all });
    } catch {
      void message.error(t('suppliers.deleteConfirm.error'));
    } finally {
      setUnarchivingId(null);
    }
  };

  const documentColumns: TableColumnsType<SupplierSummaryDto> = canViewDocuments ? [
    {
      title: t('suppliers.columns.documents'),
      dataIndex: 'documentCount',
      key: 'documentCount',
      width: 120,
      align: 'right',
      sorter: (a, b) => (a.documentCount ?? 0) - (b.documentCount ?? 0),
      render: (documentCount: number | undefined, record) =>
        (documentCount ?? 0) > 0 ? (
          <Link to="/documents" search={{ supplierId: record.id }}>
            <Numeric>{documentCount}</Numeric>
          </Link>
        ) : (
          '—'
        ),
    },
    {
      title: t('suppliers.columns.spend'),
      dataIndex: 'spend',
      key: 'spend',
      width: 160,
      align: 'right',
      sorter: (a, b) => (a.spend?.[0]?.total ?? 0) - (b.spend?.[0]?.total ?? 0),
      render: (spend: SupplierSpendDto[] | undefined) =>
        spend && spend.length > 0 ? (
          <Flex vertical align="end" gap={2}>
            {spend.map((entry) => (
              <Amount
                key={entry.currency}
                value={entry.total}
                currency={entry.currency}
                tone="expense"
              />
            ))}
          </Flex>
        ) : (
          '—'
        ),
    },
  ] : [];

  const columns: TableColumnsType<SupplierSummaryDto> = [
    {
      title: t('suppliers.columns.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
      render: (name: string, record) => (
        <Flex align="center" gap={8}>
          <span>{name}</span>
          {isSupplierArchived(record) ? (
            <SemanticTag tone="neutral">{t('common.archivedTag')}</SemanticTag>
          ) : null}
        </Flex>
      ),
    },
    {
      title: t('suppliers.columns.taxId'),
      dataIndex: 'taxId',
      key: 'taxId',
      width: 160,
      render: (taxId: string | null | undefined) => taxId || '—',
    },
    {
      title: t('suppliers.columns.email'),
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null | undefined) => email || '—',
    },
    {
      title: t('suppliers.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (phone: string | null | undefined) => phone || '—',
    },
    ...documentColumns,
    ...(canEdit ? [{
      title: t('suppliers.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: SupplierSummaryDto) => {
        if (isSupplierArchived(record)) {
          return (
            <Button
              type="text"
              aria-label={t('common.unarchive')}
              loading={unarchivingId === record.id}
              onClick={() => void handleUnarchive(record)}
            >
              {t('common.unarchive')}
            </Button>
          );
        }

        return (
          <Flex gap={4} justify="center">
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label={t('common.edit')}
              onClick={() => handleEdit(record)}
            />
            <Popconfirm
              title={t('suppliers.deleteConfirm.title')}
              description={
                <Flex vertical gap={4}>
                  <span>{t('suppliers.deleteConfirm.content', { name: record.name })}</span>
                  <Text type="secondary">{t('suppliers.deleteConfirm.archiveHint')}</Text>
                </Flex>
              }
              okText={t('suppliers.deleteConfirm.ok')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                aria-label={t('common.delete')}
                loading={deletingId === record.id}
              />
            </Popconfirm>
          </Flex>
        );
      },
    }] : []),
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('suppliers.title')}
        subtitle={t('suppliers.subtitle')}
        actions={
          canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('suppliers.add')}</Button> : undefined
        }
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert type="error" showIcon title={t('suppliers.loadError')} />
      ) : suppliers.length === 0 ? (
        <EmptyHint
          icon={<TeamOutlined />}
          title={t('suppliers.empty')}
          action={canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('suppliers.add')}</Button> : undefined}
        />
      ) : (
        <>
          <Flex align="center" justify="space-between" gap={12} wrap className={styles.filters}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('suppliers.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.search}
            />
            <Flex align="center" gap={8}>
              <Switch
                checked={showArchived}
                onChange={setShowArchived}
                aria-label={t('common.showArchived')}
              />
              <span>{t('common.showArchived')}</span>
            </Flex>
          </Flex>
          <TableSurface>
            <Table<SupplierSummaryDto>
              columns={columns}
              dataSource={filteredSuppliers}
              rowKey="id"
              rowClassName={(record) => isSupplierArchived(record) ? styles.archivedRow : ''}
              sticky
              pagination={{ pageSize: 20, showSizeChanger: true }}
              locale={{ emptyText: <EmptyHint icon={<TeamOutlined />} title={t('common.noSearchResults')} /> }}
            />
          </TableSurface>
        </>
      )}

      {canEdit && (
        <SupplierFormModal
          open={isFormOpen}
          supplier={editingSupplier}
          onCancel={handleCancelForm}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </PageContainer>
  );
}

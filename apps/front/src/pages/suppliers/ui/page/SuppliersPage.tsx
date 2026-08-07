import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Flex,
  Input,
  Popconfirm,
  Skeleton,
  Table,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createSupplier,
  deleteSupplier,
  supplierQueries,
  updateSupplier,
  type SupplierDto,
} from '@/entities/supplier';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { TableSurface } from '@/shared/ui/TableSurface';
import { SupplierFormModal, type SupplierFormValues } from '../form/SupplierFormModal';
import styles from './SuppliersPage.module.css';

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
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('suppliers', 'edit');

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.taxId]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [search, suppliers]);

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
      await deleteSupplier(supplier.id);
      void message.success(t('suppliers.deleted'));
      await queryClient.invalidateQueries({ queryKey: supplierQueries.all });
    } catch {
      void message.error(t('suppliers.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<SupplierDto> = [
    {
      title: t('suppliers.columns.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
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
    ...(canEdit ? [{
      title: t('suppliers.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: SupplierDto) => (
        <Flex gap={4} justify="center">
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={t('common.edit')}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={t('suppliers.deleteConfirm.title')}
            description={t('suppliers.deleteConfirm.content', { name: record.name })}
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
      ),
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
        <Alert type="error" showIcon message={t('suppliers.loadError')} />
      ) : suppliers.length === 0 ? (
        <EmptyHint
          icon={<TeamOutlined />}
          title={t('suppliers.empty')}
          action={canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('suppliers.add')}</Button> : undefined}
        />
      ) : (
        <>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('suppliers.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={styles.search}
          />
          <TableSurface>
            <Table<SupplierDto>
              columns={columns}
              dataSource={filteredSuppliers}
              rowKey="id"
              sticky
              pagination={{ pageSize: 20, showSizeChanger: true }}
              locale={{ emptyText: <EmptyHint icon={<TeamOutlined />} title={t('common.noSearchResults')} /> }}
            />
          </TableSurface>
        </>
      )}

      <SupplierFormModal
        open={isFormOpen}
        supplier={editingSupplier}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}

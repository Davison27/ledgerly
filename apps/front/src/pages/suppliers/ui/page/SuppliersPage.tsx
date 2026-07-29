import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Skeleton,
  Table,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
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
import { SupplierFormModal, type SupplierFormValues } from '../form/SupplierFormModal';

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
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('suppliers', 'edit');

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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('suppliers.empty')}>
          {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('suppliers.add')}</Button>}
        </Empty>
      ) : (
        <Table<SupplierDto>
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          pagination={false}
        />
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

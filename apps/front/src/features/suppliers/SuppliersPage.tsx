import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Spin,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '../../data/api/suppliers.api';
import { ApiError } from '../../data/api/httpClient';
import type { SupplierDto } from '../../data/api/types';
import { PageContainer } from '../../components/ui/PageContainer';
import { SupplierFormModal, type SupplierFormValues } from './components/SupplierFormModal';

const { Title, Text } = Typography;

export function SuppliersPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);

  const loadSuppliers = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listSuppliers()
      .then(setSuppliers)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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
      loadSuppliers();
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
      loadSuppliers();
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
    {
      title: t('suppliers.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
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
    },
  ];

  return (
    <PageContainer>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('suppliers.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('suppliers.add')}
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('suppliers.subtitle')}
      </Text>

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('suppliers.loadError')} />
      ) : suppliers.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('suppliers.empty')}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('suppliers.add')}
          </Button>
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

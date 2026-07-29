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
  Typography,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createProduct,
  deleteProduct,
  productQueries,
  updateProduct,
  type ProductDto,
} from '@/entities/product';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { ProductFormModal, type ProductFormValues } from '../form/ProductFormModal';

const { Text } = Typography;

export function ProductsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: products = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(productQueries.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('products', 'edit');

  const handleAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: ProductDto) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (values: ProductFormValues) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, values);
        void message.success(t('products.form.updated'));
      } else {
        await createProduct(values);
        void message.success(t('products.form.created'));
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      await queryClient.invalidateQueries({ queryKey: productQueries.all });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('products.form.duplicateName'));
        return;
      }
      void message.error(
        editingProduct ? t('products.form.updateError') : t('products.form.createError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product: ProductDto) => {
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      void message.success(t('products.deleted'));
      await queryClient.invalidateQueries({ queryKey: productQueries.all });
    } catch {
      void message.error(t('products.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const columns: TableColumnsType<ProductDto> = [
    {
      title: t('products.columns.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('products.columns.price'),
      dataIndex: 'price',
      key: 'price',
      width: 160,
      align: 'right',
      render: (price: number | null) => (price === null ? '—' : <Amount value={price} />),
    },
    {
      title: t('products.columns.stock'),
      dataIndex: 'stock',
      key: 'stock',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.stock - b.stock,
      render: (stock: number) =>
        stock === 0 ? (
          <Text type="secondary">{t('products.stockUnset')}</Text>
        ) : (
          <Numeric>{stock}</Numeric>
        ),
    },
    ...(canEdit ? [{
      title: t('products.columns.actions'),
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: ProductDto) => (
        <Flex gap={4} justify="center">
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label={t('common.edit')}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={t('products.deleteConfirm.title')}
            description={t('products.deleteConfirm.content', { name: record.name })}
            okText={t('products.deleteConfirm.ok')}
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
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          canEdit ? <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('products.add')}</Button> : undefined
        }
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadError ? (
        <Alert type="error" showIcon message={t('products.loadError')} />
      ) : products.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('products.empty')}>
          {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{t('products.add')}</Button>}
        </Empty>
      ) : (
        <Table<ProductDto>
          columns={columns}
          dataSource={products}
          rowKey="id"
          pagination={false}
        />
      )}

      <ProductFormModal
        open={isFormOpen}
        product={editingProduct}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}

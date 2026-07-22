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
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../../data/api/products.api';
import { ApiError } from '../../data/api/httpClient';
import type { ProductDto } from '../../data/api/types';
import { PageContainer } from '../../components/ui/PageContainer';
import { Amount } from '../../components/ui/Amount';
import { ProductFormModal, type ProductFormValues } from './components/ProductFormModal';

const { Title, Text } = Typography;

export function ProductsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    listProducts()
      .then(setProducts)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      loadProducts();
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
      loadProducts();
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
      title: t('products.columns.actions'),
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
    },
  ];

  return (
    <PageContainer>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('products.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('products.add')}
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('products.subtitle')}
      </Text>

      {loading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('products.loadError')} />
      ) : products.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('products.empty')}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('products.add')}
          </Button>
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

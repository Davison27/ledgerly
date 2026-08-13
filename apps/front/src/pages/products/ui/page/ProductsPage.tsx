import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Alert, Button, Card, Flex, Input, Select, Skeleton } from 'antd';
import { PlusOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons';
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
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { ProductFormModal, type ProductFormValues } from '../form/ProductFormModal';
import { ProductDetailModal } from '../detail/ProductDetailModal';
import { ProductCard } from '../card/ProductCard';
import styles from './ProductsPage.module.css';

type ProductSortOrder = 'nameAsc' | 'priceAsc' | 'priceDesc';

function ProductCardSkeleton() {
  return (
    <Card className={styles.skeletonCard} classNames={{ body: styles.skeletonBody }}>
      <Skeleton.Image active className={styles.skeletonVisual} />
      <Skeleton active title={{ width: '58%' }} paragraph={{ rows: 2, width: ['38%', '82%'] }} />
      <Skeleton active title={{ width: '82%' }} paragraph={{ rows: 1, width: ['100%'] }} />
    </Card>
  );
}

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
  const [viewingProduct, setViewingProduct] = useState<ProductDto | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<ProductSortOrder>('nameAsc');
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('products', 'edit');

  const handleAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: ProductDto) => {
    setViewingProduct(null);
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      if (category && product.category !== category) return false;
      if (!query) return true;
      return [
        product.name,
        product.reference,
        product.category,
        product.brand,
        product.description,
        ...product.tags,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query));
    });
    const sorted = [...filtered];
    if (sortOrder === 'nameAsc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return sortOrder === 'priceAsc' ? a.price - b.price : b.price - a.price;
      });
    }
    return sorted;
  }, [category, products, search, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory(undefined);
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

  return (
    <PageContainer>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          canEdit ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('products.add')}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('products.loadError')} />
      ) : products.length === 0 ? (
        <EmptyHint
          icon={<ShoppingOutlined />}
          title={t('products.empty')}
          action={
            canEdit ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('products.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Flex gap={12} wrap className={styles.filters}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t('products.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.search}
            />
            <Select
              allowClear
              placeholder={t('products.categoryFilter')}
              value={category}
              onChange={setCategory}
              options={categories.map((value) => ({ value, label: value }))}
              className={styles.categoryFilter}
            />
            <Select<ProductSortOrder>
              value={sortOrder}
              onChange={setSortOrder}
              className={styles.sortSelect}
              options={[
                { value: 'nameAsc', label: t('products.sort.nameAsc') },
                { value: 'priceAsc', label: t('products.sort.priceAsc') },
                { value: 'priceDesc', label: t('products.sort.priceDesc') },
              ]}
            />
          </Flex>
          {filteredProducts.length === 0 ? (
            <EmptyHint
              icon={<ShoppingOutlined />}
              title={t('products.emptySearch')}
              action={<Button onClick={handleClearFilters}>{t('common.clearFilters')}</Button>}
            />
          ) : (
            <div className={styles.grid}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  canEdit={canEdit}
                  deleteLoading={deletingId === product.id}
                  onOpen={setViewingProduct}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ProductFormModal
        open={isFormOpen}
        product={editingProduct}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
      <ProductDetailModal
        open={viewingProduct !== null}
        product={viewingProduct}
        canEdit={canEdit}
        onClose={() => setViewingProduct(null)}
        onEdit={handleEdit}
      />
    </PageContainer>
  );
}

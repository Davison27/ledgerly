import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Alert, Button, Card, Flex, Input, Select, Skeleton } from 'antd';
import { PlusOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createEquipment,
  deleteEquipment,
  equipmentQueries,
  updateEquipment,
  type EquipmentDto,
} from '@/entities/equipment';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { EquipmentFormModal, type EquipmentFormValues } from '../form/EquipmentFormModal';
import { EquipmentDetailModal } from '../detail/EquipmentDetailModal';
import { EquipmentCard } from '../card/EquipmentCard';
import styles from './EquipmentPage.module.css';

type EquipmentSortOrder = 'nameAsc' | 'priceAsc' | 'priceDesc';

function EquipmentCardSkeleton() {
  return (
    <Card className={styles.skeletonCard} classNames={{ body: styles.skeletonBody }}>
      <Skeleton.Image active className={styles.skeletonVisual} />
      <Skeleton active title={{ width: '58%' }} paragraph={{ rows: 2, width: ['38%', '82%'] }} />
      <Skeleton active title={{ width: '82%' }} paragraph={{ rows: 1, width: ['100%'] }} />
    </Card>
  );
}

export function EquipmentPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: equipment = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(equipmentQueries.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentDto | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<EquipmentDto | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<EquipmentSortOrder>('nameAsc');
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('equipment', 'edit');

  const handleAdd = () => {
    setEditingEquipment(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: EquipmentDto) => {
    setViewingEquipment(null);
    setEditingEquipment(item);
    setIsFormOpen(true);
  };

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          equipment
            .map((item) => item.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [equipment],
  );

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = equipment.filter((item) => {
      if (category && item.category !== category) return false;
      if (!query) return true;
      return [
        item.name,
        item.reference,
        item.category,
        item.brand,
        item.description,
        ...item.tags,
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
  }, [category, equipment, search, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory(undefined);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingEquipment(null);
  };

  const handleSubmit = async (values: EquipmentFormValues) => {
    setSubmitting(true);
    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, values);
        void message.success(t('equipment.form.updated'));
      } else {
        await createEquipment(values);
        void message.success(t('equipment.form.created'));
      }
      setIsFormOpen(false);
      setEditingEquipment(null);
      await queryClient.invalidateQueries({ queryKey: equipmentQueries.all });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('equipment.form.duplicateName'));
        return;
      }
      void message.error(
        editingEquipment ? t('equipment.form.updateError') : t('equipment.form.createError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: EquipmentDto) => {
    setDeletingId(item.id);
    try {
      await deleteEquipment(item.id);
      void message.success(t('equipment.deleted'));
      await queryClient.invalidateQueries({ queryKey: equipmentQueries.all });
    } catch {
      void message.error(t('equipment.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('equipment.title')}
        subtitle={t('equipment.subtitle')}
        actions={
          canEdit ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('equipment.add')}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <EquipmentCardSkeleton key={index} />
          ))}
        </div>
      ) : loadError ? (
        <Alert type="error" showIcon message={t('equipment.loadError')} />
      ) : equipment.length === 0 ? (
        <EmptyHint
          icon={<ShoppingOutlined />}
          title={t('equipment.empty')}
          action={
            canEdit ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                {t('equipment.add')}
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
              placeholder={t('equipment.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={styles.search}
            />
            <Select
              allowClear
              placeholder={t('equipment.categoryFilter')}
              value={category}
              onChange={setCategory}
              options={categories.map((value) => ({ value, label: value }))}
              className={styles.categoryFilter}
            />
            <Select<EquipmentSortOrder>
              value={sortOrder}
              onChange={setSortOrder}
              className={styles.sortSelect}
              options={[
                { value: 'nameAsc', label: t('equipment.sort.nameAsc') },
                { value: 'priceAsc', label: t('equipment.sort.priceAsc') },
                { value: 'priceDesc', label: t('equipment.sort.priceDesc') },
              ]}
            />
          </Flex>
          {filteredEquipment.length === 0 ? (
            <EmptyHint
              icon={<ShoppingOutlined />}
              title={t('equipment.emptySearch')}
              action={<Button onClick={handleClearFilters}>{t('common.clearFilters')}</Button>}
            />
          ) : (
            <div className={styles.grid}>
              {filteredEquipment.map((item) => (
                <EquipmentCard
                  key={item.id}
                  equipment={item}
                  canEdit={canEdit}
                  deleteLoading={deletingId === item.id}
                  onOpen={setViewingEquipment}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      <EquipmentFormModal
        open={isFormOpen}
        equipment={editingEquipment}
        onCancel={handleCancelForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
      <EquipmentDetailModal
        open={viewingEquipment !== null}
        equipment={viewingEquipment}
        canEdit={canEdit}
        onClose={() => setViewingEquipment(null)}
        onEdit={handleEdit}
      />
    </PageContainer>
  );
}

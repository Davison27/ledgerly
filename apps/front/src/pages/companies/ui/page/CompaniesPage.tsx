import { Alert, Button, Card, Flex, Skeleton, Switch } from 'antd';
import { PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { ClientCard } from '../card/ClientCard';
import { ClientFormModal } from '../form/ClientFormModal';
import styles from './CompaniesPage.module.css';
import type { CompaniesPageModel } from '../../model/useCompaniesPage';

const SKELETON_CARD_COUNT = 6;

function ClientCardSkeleton() {
  return (
    <Card className={styles.skeletonCard}>
      <Skeleton active avatar paragraph={{ rows: 4 }} />
    </Card>
  );
}

export interface CompaniesPageProps {
  model: CompaniesPageModel;
}

export function CompaniesPage({ model }: CompaniesPageProps) {
  const {
    t,
    clients,
    visibleClients,
    isPending,
    isError,
    showArchived,
    setShowArchived,
    canEdit,
    isFormOpen,
    editingClient,
    submitting,
    deletingId,
    unarchivingId,
    handleAdd,
    handleEdit,
    handleSubmit,
    handleDelete,
    handleUnarchive,
    closeForm,
    onOpenClient,
  } = model;

  return (
    <PageContainer>
      <PageHeader
        title={t('companies.title')}
        subtitle={t('companies.subtitle')}
        actions={canEdit ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('companies.add')}
          </Button>
        ) : undefined}
      />

      {isPending ? (
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <ClientCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <Alert type="error" showIcon title={t('companies.loadError')} />
      ) : clients.length === 0 ? (
        <EmptyHint
          icon={<ProjectOutlined />}
          title={t('companies.empty')}
          hint={t('companies.emptyHint')}
          action={canEdit ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {t('companies.add')}
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          <Flex align="center" justify="flex-end" gap={8} className={styles.filters}>
            <Switch
              checked={showArchived}
              onChange={setShowArchived}
              aria-label={t('companies.showArchived')}
            />
            <span>{t('companies.showArchived')}</span>
          </Flex>
          {visibleClients.length === 0 ? (
            <EmptyHint icon={<ProjectOutlined />} title={t('common.noSearchResults')} />
          ) : (
            <div className={styles.grid}>
              {visibleClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  canEdit={canEdit}
                  deleting={deletingId === client.id}
                  unarchiving={unarchivingId === client.id}
                  onEdit={(selected) => void handleEdit(selected)}
                  onDelete={(selected) => void handleDelete(selected)}
                  onUnarchive={(selected) => void handleUnarchive(selected)}
                  onOpen={onOpenClient}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ClientFormModal
        open={isFormOpen}
        client={editingClient}
        onCancel={closeForm}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}

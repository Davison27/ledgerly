import type { MouseEvent } from 'react';
import { Avatar, Button, Card, Flex, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, ProjectOutlined, RollbackOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ClientSummaryDto } from '@/entities/client';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import styles from './ClientCard.module.css';

const { Text } = Typography;

export interface ClientCardProps {
  client: ClientSummaryDto;
  canEdit: boolean;
  deleting?: boolean;
  unarchiving?: boolean;
  onEdit: (client: ClientSummaryDto) => void;
  onDelete: (client: ClientSummaryDto) => void;
  onUnarchive: (client: ClientSummaryDto) => void;
  onOpen?: (client: ClientSummaryDto) => void;
}

function projectsPath(clientId: string): string {
  return `/companies/${encodeURIComponent(clientId)}/projects`;
}

export function ClientCard({
  client,
  canEdit,
  deleting = false,
  unarchiving = false,
  onEdit,
  onDelete,
  onUnarchive,
  onOpen,
}: ClientCardProps) {
  const { t } = useTranslation();
  const archived = client.archivedAt !== null && client.archivedAt !== undefined;
  const projectCountKey = client.projectCount === 1
    ? 'companies.projectCount_one'
    : 'companies.projectCount_other';
  const handleOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen) return;
    event.preventDefault();
    onOpen(client);
  };

  return (
    <Card className={`${styles.card} ${archived ? styles.archived : ''}`} classNames={{ body: styles.body }}>
      <div className={styles.identity}>
        <Avatar className={styles.avatar} icon={<ProjectOutlined />} size={48} />
        <div className={styles.details}>
          <a
            href={projectsPath(client.id)}
            className={styles.name}
            onClick={handleOpen}
            aria-label={`${t('companies.openProjects')}: ${client.name}`}
          >
            {client.name}
          </a>
          <Text type="secondary" className={styles.taxId}>
            {client.taxId ?? t('companies.taxId')}
          </Text>
          {archived ? <SemanticTag tone="neutral">{t('companies.archivedTag')}</SemanticTag> : null}
        </div>
      </div>

      <div className={styles.contact}>
        {client.contactName ? <span className={styles.contactLine}>{client.contactName}</span> : null}
        {client.contactEmail ? <span className={styles.contactLine}>{client.contactEmail}</span> : null}
        {client.contactPhone ? <span className={styles.contactLine}>{client.contactPhone}</span> : null}
        {!client.contactName && !client.contactEmail && !client.contactPhone ? (
          <span>{t('companies.noContact')}</span>
        ) : null}
      </div>

      <div className={styles.footer}>
        <a
          href={projectsPath(client.id)}
          className={styles.projectLink}
          onClick={handleOpen}
        >
          <ProjectOutlined aria-hidden="true" />
          <Numeric>{client.projectCount}</Numeric>
          <span>{t(projectCountKey, { count: client.projectCount })}</span>
        </a>
        {canEdit ? (
          <Flex gap={4} className={styles.actions}>
            {archived ? (
              <Button
                type="text"
                icon={<RollbackOutlined />}
                loading={unarchiving}
                aria-label={t('common.unarchive')}
                onClick={() => onUnarchive(client)}
              >
                {t('common.unarchive')}
              </Button>
            ) : (
              <>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label={`${t('common.edit')}: ${client.name}`}
                  onClick={() => onEdit(client)}
                />
                <Popconfirm
                  title={t('companies.deleteConfirm.title')}
                  description={t('companies.deleteConfirm.content', { name: client.name })}
                  okText={t('companies.deleteConfirm.ok')}
                  cancelText={t('common.cancel')}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(client)}
                >
                  <Button
                    danger
                    type="text"
                    icon={<DeleteOutlined />}
                    loading={deleting}
                    aria-label={`${t('common.delete')}: ${client.name}`}
                  />
                </Popconfirm>
              </>
            )}
          </Flex>
        ) : null}
      </div>
    </Card>
  );
}

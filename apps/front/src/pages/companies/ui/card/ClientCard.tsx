import type { MouseEvent } from 'react';
import { App, Avatar, Button, Card, Dropdown, type MenuProps, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  MoreOutlined,
  ProjectOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ClientSummaryDto } from '@/entities/client';
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
  const { modal } = App.useApp();
  const archived = client.archivedAt !== null && client.archivedAt !== undefined;
  const projectCountKey = client.projectCount === 1
    ? 'companies.projectCount_one'
    : 'companies.projectCount_other';
  const handleOpen = () => {
    onOpen?.(client);
  };
  const stopTriggerPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('companies.deleteConfirm.title'),
      content: (
        <div>
          <div>{t('companies.deleteConfirm.content', { name: client.name })}</div>
          <Text type="secondary">{t('companies.deleteConfirm.archiveHint')}</Text>
        </div>
      ),
      okText: t('companies.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => onDelete(client),
    });
  };

  const menuItems: MenuProps['items'] = archived
    ? [{
        key: 'unarchive',
        icon: unarchiving ? <LoadingOutlined /> : <RollbackOutlined />,
        label: t('common.unarchive'),
        disabled: unarchiving,
        onClick: (info) => {
          info.domEvent.stopPropagation();
          onUnarchive(client);
        },
      }]
    : [
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: t('common.edit'),
          onClick: (info) => {
            info.domEvent.stopPropagation();
            onEdit(client);
          },
        },
        {
          key: 'delete',
          danger: true,
          disabled: deleting,
          icon: deleting ? <LoadingOutlined /> : <DeleteOutlined />,
          label: t('common.delete'),
          onClick: (info) => {
            info.domEvent.stopPropagation();
            confirmDelete();
          },
        },
      ];

  return (
    <Card
      hoverable
      onClick={handleOpen}
      className={`${styles.card} ${archived ? styles.archived : ''}`}
      classNames={{ body: styles.body }}
    >
      <div className={styles.identity}>
        <Avatar className={styles.avatar} icon={<ProjectOutlined />} size={48} />
        <div className={styles.details}>
          <a
            href={projectsPath(client.id)}
            className={styles.name}
            onClick={stopTriggerPropagation}
            aria-label={`${t('companies.openProjects')}: ${client.name}`}
          >
            {client.name}
          </a>
          <Text type="secondary" className={styles.taxId}>
            {client.taxId ?? t('companies.taxId')}
          </Text>
          {archived ? <SemanticTag tone="neutral">{t('companies.archivedTag')}</SemanticTag> : null}
        </div>
        {canEdit ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={t('common.actions')}
              onClick={stopTriggerPropagation}
              className={styles.moreButton}
            />
          </Dropdown>
        ) : null}
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
          onClick={stopTriggerPropagation}
        >
          <ProjectOutlined aria-hidden="true" />
          <span>{t(projectCountKey, { count: client.projectCount })}</span>
        </a>
      </div>
    </Card>
  );
}

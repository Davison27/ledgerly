import { Avatar, Card, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  LoadingOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Project } from '@/entities/project';
import styles from './ProjectCard.module.css';

const { Meta } = Card;

export interface ProjectCardProps {
  project: Project;
  color: string;
  editLoading?: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({
  project,
  color,
  editLoading,
  onOpen,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const { t } = useTranslation();

  const actions = [
    <Tooltip key="delete" title={t('common.delete')}>
      <DeleteOutlined
        className={styles.deleteIcon}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(project);
        }}
      />
    </Tooltip>,
    <Tooltip key="edit" title={t('common.edit')}>
      {editLoading ? (
        <LoadingOutlined />
      ) : (
        <EditOutlined
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
        />
      )}
    </Tooltip>,
    <Tooltip key="open" title={t('common.open')}>
      <ExportOutlined
        className={styles.openIcon}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(project);
        }}
      />
    </Tooltip>,
  ];

  return (
    <Card hoverable classNames={{ header: styles.header }} actions={actions}>
      <Meta
        avatar={
          project.image ? (
            <Avatar shape="square" size={48} src={project.image} />
          ) : (
            <Avatar
              shape="square"
              size={48}
              style={{ backgroundColor: color }}
              icon={<ProjectOutlined />}
            />
          )
        }
        title={project.name}
        description={
          <>
            <div className={styles.metaLine}>{project.code}</div>
            <div className={styles.metaLine}>
              {t('projects.docSummary', {
                docs: project.documentCount,
                pending: project.pendingCount,
              })}
            </div>
          </>
        }
      />
    </Card>
  );
}

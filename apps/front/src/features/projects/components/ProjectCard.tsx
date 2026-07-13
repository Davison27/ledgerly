import { Avatar, Badge, Card, Tooltip, theme, type CardProps } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../../data/company';

const { Meta } = Card;
const { useToken } = theme;

export interface ProjectCardProps {
  project: Project;
  color: string;
  isOpen?: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({
  project,
  color,
  isOpen,
  onOpen,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const styles: CardProps['styles'] = {
    root: {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      borderRadius: token.borderRadius,
    },
    header: { borderBottom: 'none', paddingBottom: 8 },
  };

  const actions = [
    <Tooltip key="delete" title={t('common.delete')}>
      <DeleteOutlined
        style={{ color: token.colorError }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(project);
        }}
      />
    </Tooltip>,
    <Tooltip key="edit" title={t('common.edit')}>
      <EditOutlined
        onClick={(e) => {
          e.stopPropagation();
          onEdit(project);
        }}
      />
    </Tooltip>,
    <Tooltip key="open" title={t('common.open')}>
      <ExportOutlined
        style={{ color: token.colorSuccess }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(project);
        }}
      />
    </Tooltip>,
  ];

  return (
    <Card styles={styles} actions={actions}>
      <Meta
        avatar={
          <Badge dot={isOpen} color={token.colorSuccess} offset={[-4, 4]}>
            <Avatar
              shape="square"
              size={48}
              style={{ backgroundColor: color }}
              icon={<ProjectOutlined />}
            />
          </Badge>
        }
        title={project.name}
        description={
          <>
            <div style={{ marginBottom: 2 }}>{project.code}</div>
            <div style={{ marginBottom: 2 }}>
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

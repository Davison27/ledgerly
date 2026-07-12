import { Avatar, Card, Tooltip, theme, type CardProps } from 'antd';
import { EditOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Enterprise } from '../../../data/enterprises';

const { Meta } = Card;
const { useToken } = theme;

export interface EnterpriseCardProps {
  enterprise: Enterprise;
  onOpen: (enterprise: Enterprise) => void;
  onEdit: (enterprise: Enterprise) => void;
  onDelete: (enterprise: Enterprise) => void;
}

export function EnterpriseCard({
  enterprise,
  onOpen,
  onEdit,
  onDelete,
}: EnterpriseCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const projectCount = enterprise.projects.length;

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
          onDelete(enterprise);
        }}
      />
    </Tooltip>,
    <Tooltip key="edit" title={t('common.edit')}>
      <EditOutlined
        onClick={(e) => {
          e.stopPropagation();
          onEdit(enterprise);
        }}
      />
    </Tooltip>,
    <Tooltip key="open" title={t('common.open')}>
      <ExportOutlined
        style={{ color: token.colorSuccess }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(enterprise);
        }}
      />
    </Tooltip>,
  ];

  return (
    <Card
      styles={styles}
      actions={actions}
    >
      <Meta
        avatar={
          <Avatar
            shape="square"
            size={48}
            style={{ backgroundColor: enterprise.color, fontWeight: 700 }}
          >
            {enterprise.initials}
          </Avatar>
        }
        title={enterprise.name}
        description={t(
          projectCount === 1
            ? 'enterprises.projectCountSingular'
            : 'enterprises.projectCountPlural',
          { count: projectCount },
        )}
      />
    </Card>
  );
}

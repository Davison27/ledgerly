import type { MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { App, Avatar, Button, Dropdown, type MenuProps, Card, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, LoadingOutlined, MoreOutlined, ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Project } from '@/entities/project';
import { useSemanticColors } from '@/shared/lib/useSemanticColors';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import typography from '@/shared/ui/typography.module.css';
import styles from './ProjectCard.module.css';

const { Text } = Typography;

export interface ProjectCardProps {
  project: Project;
  color: string;
  editLoading?: boolean;
  deleteLoading?: boolean;
  canEdit: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({
  project,
  color,
  editLoading,
  deleteLoading,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const colors = useSemanticColors();
  const currency = project.currency ?? 'EUR';
  const financials = project.financials?.find((entry) => entry.currency === currency) ?? {
    currency,
    income: 0,
    expenses: 0,
    profit: 0,
    margin: null,
  };
  const otherCurrencies = (project.financials ?? [])
    .filter((entry) => entry.currency !== currency)
    .map((entry) => entry.currency);
  const marginColor =
    financials.margin === null
      ? 'var(--ant-color-text-tertiary)'
      : financials.margin > 0
        ? colors.income
        : financials.margin < 0
          ? colors.expense
          : undefined;

  const handleOpen = () => onOpen(project);

  const stopTriggerPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('projects.deleteConfirm.title'),
      content: t('projects.deleteConfirm.content', { name: project.name }),
      okText: t('projects.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => onDelete(project),
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: editLoading ? <LoadingOutlined /> : <EditOutlined />,
      label: t('common.edit'),
      disabled: editLoading,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onEdit(project);
      },
    },
    {
      key: 'delete',
      danger: true,
      icon: deleteLoading ? <LoadingOutlined /> : <DeleteOutlined />,
      label: t('common.delete'),
      disabled: deleteLoading,
      onClick: (info) => {
        info.domEvent.stopPropagation();
        confirmDelete();
      },
    },
  ];

  return (
    <Card hoverable onClick={handleOpen} className={styles.card} classNames={{ body: styles.body }}>
      <div className={styles.topRow}>
        {project.image ? (
          <Avatar shape="square" size={48} src={project.image} className={styles.avatar} />
        ) : (
          <Avatar
            shape="square"
            size={48}
            style={{ backgroundColor: color }}
            icon={<ProjectOutlined />}
            className={styles.avatar}
          />
        )}
        <div className={styles.info}>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className={styles.name}
            onClick={stopTriggerPropagation}
          >
            {project.name}
          </Link>
          <Text type="secondary" className={typography.numeric}>
            {project.code}
          </Text>
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

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={typography.kpiValueSm}>
            <Amount value={financials.income} currency={financials.currency} tone="income" />
          </div>
          <Text type="secondary" className={typography.kpiLabel}>
            {t('projects.card.income')}
          </Text>
        </div>
        <div className={styles.metric}>
          <div className={typography.kpiValueSm}>
            <Amount value={financials.expenses} currency={financials.currency} tone="expense" />
          </div>
          <Text type="secondary" className={typography.kpiLabel}>
            {t('projects.card.expenses')}
          </Text>
        </div>
        <div className={styles.metric}>
          <div className={typography.kpiValueSm} style={{ color: marginColor }}>
            <Numeric>
              {financials.margin === null
                ? '—'
                : new Intl.NumberFormat(undefined, {
                    style: 'percent',
                    maximumFractionDigits: 0,
                  }).format(financials.margin)}
            </Numeric>
          </div>
          <Text type="secondary" className={typography.kpiLabel}>
            {t('projects.card.margin')}
          </Text>
        </div>
        {otherCurrencies.length > 0 ? (
          <span title={`${t('projects.card.otherCurrencies')}: ${otherCurrencies.join(', ')}`}>
            <SemanticTag tone="neutral">+{otherCurrencies.length}</SemanticTag>
          </span>
        ) : null}
      </div>
    </Card>
  );
}

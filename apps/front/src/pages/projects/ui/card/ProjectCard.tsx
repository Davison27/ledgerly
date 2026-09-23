import type { CSSProperties, MouseEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { App, Avatar, Button, Card, Dropdown, type MenuProps, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MoreOutlined,
  ProjectOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Project } from '@/entities/project';
import { useWorkspaceAccess } from '@/entities/workspace-member';
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
  unarchiveLoading?: boolean;
  canEdit: boolean;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onUnarchive: (project: Project) => void;
}

export function ProjectCard({
  project,
  color,
  editLoading,
  deleteLoading,
  unarchiveLoading,
  canEdit,
  onOpen,
  onEdit,
  onDelete,
  onUnarchive,
}: ProjectCardProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const { canAccess } = useWorkspaceAccess();
  const colors = useSemanticColors();
  const currency = project.currency ?? 'EUR';
  const archived = project.status === 'archived';
  const canViewDocuments = canAccess('documents', 'view');
  const hasDocumentSummary = canViewDocuments && project.documentCount !== undefined;
  const hasFinancialSummary =
    canViewDocuments && canAccess('equipment', 'view') && project.financials !== undefined;
  const financials = project.financials?.find((entry) => entry.currency === currency) ?? {
    currency,
    income: 0,
    expenses: 0,
    profit: 0,
    margin: null,
  };
  const otherCurrencies = hasFinancialSummary
    ? (project.financials ?? [])
        .filter((entry) => entry.currency !== currency)
        .map((entry) => entry.currency)
    : [];
  const marginColor =
    financials.margin === null
      ? 'var(--ant-color-text-tertiary)'
      : financials.margin > 0
        ? colors.income
        : financials.margin < 0
          ? colors.expense
          : undefined;
  const cardStyle = { '--project-accent': color } as CSSProperties;

  const handleOpen = () => onOpen(project);

  const stopTriggerPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('projects.deleteConfirm.title'),
      content: (
        <div>
          <div>{t('projects.deleteConfirm.content', { name: project.name })}</div>
          <Text type="secondary">{t('projects.deleteConfirm.archiveHint')}</Text>
        </div>
      ),
      okText: t('projects.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => onDelete(project),
    });
  };

  const menuItems: MenuProps['items'] = archived
    ? [{
        key: 'unarchive',
        icon: unarchiveLoading ? <LoadingOutlined /> : <RollbackOutlined />,
        label: t('common.unarchive'),
        disabled: unarchiveLoading,
        onClick: (info) => {
          info.domEvent.stopPropagation();
          onUnarchive(project);
        },
      }]
    : [
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
    <Card
      hoverable
      onClick={handleOpen}
      className={`${styles.card} ${archived ? styles.archived : ''}`}
      classNames={{ body: styles.body }}
      style={cardStyle}
    >
      <div className={styles.identityHeader}>
        <div className={styles.accent} aria-hidden="true" />
        {project.image ? (
          <Avatar shape="square" size={52} src={project.image} className={styles.avatar} />
        ) : (
          <Avatar
            shape="square"
            size={52}
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
          <Text type="secondary" className={`${styles.code} ${typography.numeric}`}>
            {project.code}
          </Text>
          {archived ? <SemanticTag tone="neutral">{t('projects.form.statuses.archived')}</SemanticTag> : null}
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

      {hasFinancialSummary && (
        <>
          <div className={styles.profitSection}>
            <Text type="secondary" className={typography.kpiLabel}>
              {t('projects.card.profit')}
            </Text>
            <div className={styles.profitValue}>
              <Amount value={financials.profit} currency={financials.currency} tone="auto" strong />
            </div>
          </div>

          <div className={styles.financials}>
            <div className={styles.financialMetric}>
              <Text type="secondary" className={styles.metricLabel}>
                {t('projects.card.income')}
              </Text>
              <Amount value={financials.income} currency={financials.currency} tone="income" strong />
            </div>
            <div className={styles.financialMetric}>
              <Text type="secondary" className={styles.metricLabel}>
                {t('projects.card.expenses')}
              </Text>
              <Amount
                value={financials.expenses}
                currency={financials.currency}
                tone="expense"
                strong
              />
            </div>
          </div>
        </>
      )}

      {(hasDocumentSummary || hasFinancialSummary) && (
        <div className={styles.statusRow}>
          {hasDocumentSummary && (
            <span className={styles.documentSummary}>
              <FileTextOutlined aria-hidden="true" />
              <Numeric>{project.documentCount}</Numeric>
              <span>{t('projects.card.documents')}</span>
              {project.pendingCount !== undefined && project.pendingCount > 0 ? (
                <SemanticTag tone="pending">{project.pendingCount}</SemanticTag>
              ) : null}
            </span>
          )}
          {hasFinancialSummary && (
            <span className={styles.margin} style={{ color: marginColor }}>
              <span>{t('projects.card.margin')}</span>
              <Numeric>
                {financials.margin === null
                  ? '—'
                  : new Intl.NumberFormat(undefined, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    }).format(financials.margin)}
              </Numeric>
            </span>
          )}
          {hasFinancialSummary && otherCurrencies.length > 0 ? (
            <span title={`${t('projects.card.otherCurrencies')}: ${otherCurrencies.join(', ')}`}>
              <SemanticTag tone="neutral">+{otherCurrencies.length}</SemanticTag>
            </span>
          ) : null}
        </div>
      )}
    </Card>
  );
}

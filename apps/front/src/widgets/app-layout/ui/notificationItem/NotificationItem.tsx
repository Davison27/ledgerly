import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Flex, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  notificationDescriptionKey,
  notificationDescriptionParams,
  notificationTitleKey,
  notificationTarget,
  type NotificationView,
} from '@/entities/notification';
import { formatRelativeTime } from '@/shared/lib/dates';
import { SPACE } from '@/shared/config/theme';
import type { UseNotificationCenterResult } from '../../model/useNotificationCenter';
import styles from './NotificationItem.module.css';

const { Text } = Typography;

const SEVERITY_TAG_COLOR = {
  error: 'error',
  warning: 'warning',
  info: 'processing',
} as const;

export interface NotificationItemProps {
  view: NotificationView;
  activeOperation: UseNotificationCenterResult['activeOperation'];
  onView: UseNotificationCenterResult['onView'];
  onMarkRead: UseNotificationCenterResult['onMarkRead'];
  onResolve: UseNotificationCenterResult['onResolve'];
}

function isActiveOperation(
  operation: NotificationItemProps['activeOperation'],
  kind: 'view' | 'markRead' | 'resolve',
  notificationId: string,
) {
  if (!operation) return false;
  if (kind === 'view') return operation.kind === 'view' && operation.view.id === notificationId;
  return (
    (operation.kind === 'markRead' || operation.kind === 'resolve') &&
    operation.kind === kind &&
    operation.notificationId === notificationId
  );
}

function severityIcon(severity: NotificationView['severity']) {
  switch (severity) {
    case 'error':
      return <ExclamationCircleFilled />;
    case 'warning':
      return <WarningFilled />;
    case 'info':
      return <InfoCircleFilled />;
  }
}

export function NotificationItem({ view, activeOperation, onView, onMarkRead, onResolve }: NotificationItemProps) {
  const { t, i18n } = useTranslation();

  const descriptionParams = notificationDescriptionParams(view, i18n.language, (kind) =>
    t(`calendar.conflicts.kind.${kind}`),
  );
  const hasTarget = notificationTarget(view) !== null;
  const viewActive = isActiveOperation(activeOperation, 'view', view.id);
  const markReadActive = isActiveOperation(activeOperation, 'markRead', view.id);
  const resolveActive = isActiveOperation(activeOperation, 'resolve', view.id);
  const hasActiveOperation = activeOperation !== null;
  const titleId = `notification-title-${view.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const actions = [
    ...(hasTarget
      ? [
          <Button
            key="view"
            type="link"
            size="small"
            icon={<ArrowRightOutlined />}
            loading={viewActive}
            disabled={hasActiveOperation && !viewActive}
            aria-label={t('notifications.aria.view')}
            onClick={() => void onView(view)}
          >
            {t('notifications.view')}
          </Button>,
        ]
      : []),
    ...(!view.readAt
      ? [
          <Button
            key="mark-read"
            type="text"
            size="small"
            icon={<CheckOutlined />}
            loading={markReadActive}
            disabled={hasActiveOperation && !markReadActive}
            aria-label={t('notifications.aria.markRead')}
            onClick={() => void onMarkRead(view.id)}
          >
            {t('notifications.markRead')}
          </Button>,
        ]
      : []),
    ...(!view.resolvedAt
      ? [
          <Button
            key="resolve"
            type="text"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={resolveActive}
            disabled={hasActiveOperation && !resolveActive}
            aria-label={t('notifications.aria.resolve')}
            onClick={() => void onResolve(view.id)}
          >
            {t('notifications.resolve')}
          </Button>,
        ]
      : []),
  ];

  return (
    <li
      className={styles.item}
      data-unread={!view.readAt}
      aria-labelledby={titleId}
    >
      <Flex align="flex-start" gap={SPACE.md} className={styles.layout}>
        <span aria-hidden="true">
          <Badge dot={!view.readAt}>
            <Avatar size="small" shape="square" icon={severityIcon(view.severity)} />
          </Badge>
        </span>
        <Flex vertical gap={SPACE.xs} className={styles.content}>
          <Space size={SPACE.xs} wrap>
            <Tag color={SEVERITY_TAG_COLOR[view.severity]} variant="filled">
              {t(`notifications.severity.${view.severity}`)}
            </Tag>
            {!view.readAt && (
              <Text type="secondary" className={styles.unreadLabel}>
                {t('notifications.filters.unread')}
              </Text>
            )}
            <Text type="secondary" className={styles.time}>
              {formatRelativeTime(view.createdAt, i18n.language)}
            </Text>
          </Space>
          <Text strong id={titleId} className={styles.itemTitle}>
            {t(notificationTitleKey(view.type))}
          </Text>

          <Flex vertical gap={SPACE.sm} className={styles.description}>
            <Text type="secondary" className={styles.descriptionText}>
              {t(notificationDescriptionKey(view.type), descriptionParams)}
            </Text>

            {view.context.amount !== null && (
              <Text strong className={styles.amount}>
                {new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(
                  view.context.amount,
                )}
              </Text>
            )}

            {actions.length > 0 && <Space size={SPACE.xs} wrap>{actions}</Space>}
          </Flex>
        </Flex>
      </Flex>
    </li>
  );
}

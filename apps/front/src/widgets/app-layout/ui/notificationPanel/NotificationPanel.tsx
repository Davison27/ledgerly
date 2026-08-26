import { Alert, Button, Empty, Flex, Segmented, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { groupBySeverity } from '@/entities/notification';
import { SPACE } from '@/shared/config/theme';
import type { UseNotificationCenterResult } from '../../model/useNotificationCenter';
import { NotificationItem } from '../notificationItem/NotificationItem';
import styles from './NotificationPanel.module.css';

const { Text } = Typography;

export interface NotificationPanelProps {
  center: UseNotificationCenterResult;
}

export function NotificationPanel({ center }: NotificationPanelProps) {
  const { t } = useTranslation();
  const items = groupBySeverity(center.items).flatMap((group) => group.items);
  const failedOperation = center.mutationError?.operation;
  const hasActiveOperation = center.activeOperation !== null;

  return (
    <div className={styles.panel}>
      <Flex align="center" justify="space-between" gap={SPACE.md} className={styles.toolbar}>
        <Text type="secondary" className={styles.summary}>
          {t('notifications.unreadSummary', { count: center.unreadCount })}
        </Text>
        {center.unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            loading={center.activeOperation?.kind === 'markAllRead'}
            disabled={hasActiveOperation}
            aria-label={t('notifications.aria.markAllRead')}
            onClick={() => void center.onMarkAllRead()}
          >
            {t('notifications.markAllRead')}
          </Button>
        )}
      </Flex>

      <Segmented
        block
        className={styles.filter}
        aria-label={t('notifications.aria.filter')}
        value={center.status}
        onChange={(value) => center.setStatus(value as typeof center.status)}
        options={['open', 'unread', 'resolved', 'all'].map((status) => ({
          label: t(`notifications.filters.${status}`),
          value: status,
        }))}
      />

      {failedOperation && (
        <Alert
          className={styles.mutationAlert}
          type="error"
          showIcon
          title={t('notifications.mutationError.title')}
          description={t(`notifications.mutationError.messages.${failedOperation.kind}`)}
          action={
            <Space size={SPACE.xs} wrap>
              <Button
                type="link"
                size="small"
                loading={hasActiveOperation}
                disabled={hasActiveOperation}
                aria-label={t('notifications.aria.retry')}
                onClick={() => void center.retryMutation()}
              >
                {t('notifications.retry')}
              </Button>
              <Button
                type="text"
                size="small"
                disabled={hasActiveOperation}
                aria-label={t('notifications.aria.dismiss')}
                onClick={center.clearMutationFeedback}
              >
                {t('notifications.mutationError.dismiss')}
              </Button>
            </Space>
          }
        />
      )}

      <div className={styles.body} aria-live="polite">
        {center.loading ? (
          <div
            className={styles.loadingList}
            role="status"
            aria-busy="true"
            aria-label={t('notifications.title')}
          >
            <ul className={styles.list}>
              {[0, 1, 2].map((index) => (
                <li key={index} className={styles.loadingItem}>
                  <Skeleton active avatar paragraph={{ rows: 2 }} title={{ width: '48%' }} />
                </li>
              ))}
            </ul>
          </div>
        ) : center.loadError ? (
          <div className={styles.stateFill}>
            <Alert
              type="error"
              showIcon
              title={t('notifications.loadError')}
              action={
                <Button
                  type="link"
                  size="small"
                  aria-label={t('notifications.aria.retry')}
                  onClick={center.retryList}
                >
                  {t('notifications.retry')}
                </Button>
              }
            />
          </div>
        ) : center.items.length === 0 ? (
          <Empty
            className={styles.emptyState}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Flex vertical align="center" gap={SPACE.xs}>
                <Text>{t('notifications.empty')}</Text>
                <Text type="secondary">{t('notifications.emptyHint')}</Text>
              </Flex>
            }
          />
        ) : (
          <>
            <ul className={styles.list} aria-label={t('notifications.title')}>
              {items.map((view) => (
                <NotificationItem
                  key={view.id}
                  view={view}
                  activeOperation={center.activeOperation}
                  onView={center.onView}
                  onMarkRead={center.onMarkRead}
                  onResolve={center.onResolve}
                />
              ))}
            </ul>

            {center.hasNextPage && (
              <Flex justify="center" className={styles.loadMore}>
                <Button
                  type="link"
                  size="small"
                  loading={center.isFetchingNextPage}
                  disabled={center.isFetchingNextPage}
                  onClick={center.loadMore}
                >
                  {t('notifications.loadMore')}
                </Button>
              </Flex>
            )}
          </>
        )}
      </div>
    </div>
  );
}

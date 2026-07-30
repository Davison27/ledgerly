import { Button, Flex, Segmented, Spin, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { groupBySeverity } from '@/entities/notification';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import type { UseNotificationCenterResult } from '../../model/useNotificationCenter';
import { NotificationItem } from '../notificationItem/NotificationItem';
import styles from './NotificationPanel.module.css';

const { Text } = Typography;

export interface NotificationPanelProps {
  center: UseNotificationCenterResult;
}

export function NotificationPanel({ center }: NotificationPanelProps) {
  const { t } = useTranslation();
  const groups = groupBySeverity(center.items).filter((group) => group.items.length > 0);

  return (
    <Flex vertical className={styles.panel}>
      <Flex align="center" justify="space-between" gap={8} className={styles.header}>
        <Text strong>{t('notifications.title')}</Text>
        {center.unreadCount > 0 && (
          <Button type="link" size="small" onClick={center.onMarkAllRead}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </Flex>
      <Segmented
        size="small"
        value={center.status}
        onChange={(value) => center.setStatus(value as typeof center.status)}
        options={['open', 'unread', 'resolved', 'all'].map((status) => ({
          label: t(`notifications.filters.${status}`),
          value: status,
        }))}
      />

      <div className={styles.body}>
        {center.loading ? (
          <Flex align="center" justify="center" className={styles.stateFill}>
            <Spin />
          </Flex>
        ) : center.loadError ? (
          <Flex align="center" justify="center" className={styles.stateFill}>
            <Text type="secondary">{t('notifications.loadError')}</Text>
          </Flex>
        ) : center.items.length === 0 ? (
          <EmptyHint icon={<BellOutlined />} title={t('notifications.empty')} hint={t('notifications.emptyHint')} />
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.severity} className={styles.group}>
                <Text type="secondary" className={styles.groupHeader}>
                  {t(`notifications.severity.${group.severity}`)}
                </Text>
                {group.items.map((view) => (
                  <NotificationItem key={view.id} view={view} onSelect={center.onSelect} onResolve={center.onResolve} />
                ))}
              </div>
            ))}

            {center.hasNextPage && (
              <Flex justify="center" className={styles.loadMore}>
                <Button type="link" size="small" loading={center.isFetchingNextPage} onClick={center.loadMore}>
                  {t('notifications.loadMore')}
                </Button>
              </Flex>
            )}
          </>
        )}
      </div>
    </Flex>
  );
}

import { useCallback, useRef } from 'react';
import { Badge, Button, Drawer } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNotificationCenter } from '../../model/useNotificationCenter';
import { NotificationPanel } from '../notificationPanel/NotificationPanel';
import topBarStyles from '../topBar/TopBar.module.css';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const { t } = useTranslation();
  const center = useNotificationCenter();
  const bellRef = useRef<HTMLButtonElement>(null);
  const { close } = center;

  const closeDrawer = useCallback(() => {
    close();
  }, [close]);

  const restoreBellFocus = useCallback((isOpen: boolean) => {
    if (!isOpen) bellRef.current?.focus();
  }, []);

  const bellLabel = center.unreadCount > 0
    ? t('notifications.aria.bellWithUnread', {
        count: center.unreadCount,
        defaultValue: `${t('topbar.notifications')} (${center.unreadCount})`,
      })
    : t('notifications.aria.bell', {
        defaultValue: t('topbar.notifications'),
      });

  return (
    <>
      <Badge count={center.unreadCount} size="small" overflowCount={99} offset={[-2, 2]}>
        <Button
          ref={bellRef}
          type="text"
          aria-label={bellLabel}
          aria-haspopup="dialog"
          aria-expanded={center.open}
          aria-controls="notification-drawer"
          onClick={() => center.onOpenChange(!center.open)}
          className={topBarStyles.iconButton}
        >
          <BellOutlined className={topBarStyles.icon} />
        </Button>
      </Badge>

      <Drawer
        id="notification-drawer"
        open={center.open}
        placement="right"
        size="min(520px, 100vw)"
        title={<span id="notification-drawer-title">{t('notifications.title')}</span>}
        aria-label={t('notifications.aria.drawer')}
        aria-labelledby="notification-drawer-title"
        destroyOnHidden
        autoFocus
        onClose={closeDrawer}
        afterOpenChange={restoreBellFocus}
        classNames={{
          body: styles.drawerBody,
        }}
      >
        <NotificationPanel center={center} />
      </Drawer>
    </>
  );
}

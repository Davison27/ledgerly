import { Badge, Button, Popover } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNotificationCenter } from '../../model/useNotificationCenter';
import { NotificationPanel } from '../notificationPanel/NotificationPanel';
import topBarStyles from '../topBar/TopBar.module.css';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const { t } = useTranslation();
  const center = useNotificationCenter();

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={center.open}
      onOpenChange={center.setOpen}
      content={<NotificationPanel center={center} />}
      classNames={{ content: styles.popoverContent }}
    >
      <Badge count={center.unreadCount} size="small" overflowCount={99} offset={[-2, 2]}>
        <Button type="text" aria-label={t('topbar.notifications')} className={topBarStyles.iconButton}>
          <BellOutlined className={topBarStyles.icon} />
        </Button>
      </Badge>
    </Popover>
  );
}

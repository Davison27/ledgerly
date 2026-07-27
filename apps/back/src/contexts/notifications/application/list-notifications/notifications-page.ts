import { Page } from '../../../../shared/domain/pagination';
import { NotificationListRow } from '../../domain/notification-list-row';

export type NotificationsPage = Page<NotificationListRow> & { unreadCount: number };

import { NotificationAccessSnapshot } from '../../domain/notification-access';

export interface ListNotificationsQuery {
  page: number;
  size: number;
  status: 'unread' | 'open' | 'resolved' | 'all';
  access: NotificationAccessSnapshot;
}

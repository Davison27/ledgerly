import { Notification } from './notification';
import { NotificationListRow } from './notification-list-row';
import { NotificationAccessSnapshot } from './notification-access';
import { Page } from '../../../shared/domain/pagination';

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');

export interface NotificationPageQuery {
  page: number;
  size: number;
  status: 'unread' | 'open' | 'resolved' | 'all';
  access: NotificationAccessSnapshot;
}

export interface NotificationRepository {
  insertIfAbsent(notifications: Notification[]): Promise<Notification[]>;
  findById(id: string, access: NotificationAccessSnapshot): Promise<Notification | null>;
  save(notification: Notification, access: NotificationAccessSnapshot): Promise<boolean>;
  findPage(query: NotificationPageQuery): Promise<Page<NotificationListRow>>;
  countUnread(access: NotificationAccessSnapshot): Promise<number>;
  markAllRead(readAt: Date, access: NotificationAccessSnapshot): Promise<void>;
  resolveActiveExcept?(types: string[], activeDedupeKeys: string[], resolvedAt: Date): Promise<void>;
  deleteReadBefore(threshold: Date): Promise<number>;
}

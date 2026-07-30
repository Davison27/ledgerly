import { Notification } from './notification';
import { NotificationListRow } from './notification-list-row';
import { Page } from '../../../shared/domain/pagination';

export const NOTIFICATION_REPOSITORY = Symbol('NotificationRepository');

export interface NotificationPageQuery {
  page: number;
  size: number;
  status: 'unread' | 'open' | 'resolved' | 'all';
}

export interface NotificationRepository {
  insertIfAbsent(notifications: Notification[]): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  save(notification: Notification): Promise<void>;
  findPage(query: NotificationPageQuery): Promise<Page<NotificationListRow>>;
  countUnread(): Promise<number>;
  markAllRead(readAt: Date): Promise<void>;
  resolveActiveExcept?(types: string[], activeDedupeKeys: string[], resolvedAt: Date): Promise<void>;
  deleteReadBefore(threshold: Date): Promise<number>;
}

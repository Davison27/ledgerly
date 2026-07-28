import { buildQueryString, get, post } from '@/shared/api/httpClient';
import type { ListNotificationsParams, NotificationPageDto, NotificationUnreadCountDto } from './types';

export function listNotifications(params: ListNotificationsParams = {}): Promise<NotificationPageDto> {
  const qs = buildQueryString({
    page: params.page,
    size: params.size,
    status: params.status,
  });
  return get<NotificationPageDto>(`/notifications${qs}`);
}

export function getUnreadCount(): Promise<NotificationUnreadCountDto> {
  return get<NotificationUnreadCountDto>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<void> {
  return post<void>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return post<void>('/notifications/read-all');
}

import { NotificationsPage } from '../../application/list-notifications/notifications-page';
import { NotificationResponse } from './notification.response';

export class NotificationPageResponse {
  items: NotificationResponse[];
  total: number;
  page: number;
  size: number;
  unreadCount: number;

  static fromPage(page: NotificationsPage): NotificationPageResponse {
    const response = new NotificationPageResponse();

    response.items = page.items.map((item) => NotificationResponse.fromRow(item));
    response.total = page.total;
    response.page = page.page;
    response.size = page.size;
    response.unreadCount = page.unreadCount;

    return response;
  }
}

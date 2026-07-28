import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { ListNotificationsQuery } from './list-notifications.query';
import { NotificationsPage } from './notifications-page';

@Injectable()
export class ListNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository) {}

  async execute(query: ListNotificationsQuery): Promise<NotificationsPage> {
    const [page, unreadCount] = await Promise.all([
      this.repository.findPage(query),
      this.repository.countUnread(),
    ]);

    return { ...page, unreadCount };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NotificationAccessSnapshot } from '../../domain/notification-access';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository) {}

  execute(access: NotificationAccessSnapshot): Promise<number> {
    return this.repository.countUnread(access);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository) {}

  execute(): Promise<number> {
    return this.repository.countUnread();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<void> {
    return this.repository.markAllRead(this.clock.now());
  }
}

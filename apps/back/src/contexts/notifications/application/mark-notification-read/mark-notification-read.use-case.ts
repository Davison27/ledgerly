import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NotificationNotFoundException } from '../../domain/errors/notification-not-found.exception';
import { MarkNotificationReadCommand } from './mark-notification-read.command';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: MarkNotificationReadCommand): Promise<void> {
    const notification = await this.repository.findById(command.id);

    if (!notification) {
      throw new NotificationNotFoundException(command.id);
    }

    await this.repository.save(notification.markAsRead(this.clock.now()));
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';

@Injectable()
export class ResolveNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<void> {
    const notification = await this.repository.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    await this.repository.save(notification.resolve(this.clock.now()));
  }
}

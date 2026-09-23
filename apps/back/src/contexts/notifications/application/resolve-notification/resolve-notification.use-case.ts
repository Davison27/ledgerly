import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NotificationAccessSnapshot } from '../../domain/notification-access';

@Injectable()
export class ResolveNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string, access: NotificationAccessSnapshot): Promise<void> {
    const notification = await this.repository.findById(id, access);
    if (!notification) throw new NotFoundException('Notification not found');

    const updated = await this.repository.save(notification.resolve(this.clock.now()), access);
    if (!updated) throw new NotFoundException('Notification not found');
  }
}

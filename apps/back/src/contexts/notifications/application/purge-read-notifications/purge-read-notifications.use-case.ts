import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { READ_RETENTION_DAYS, retentionThreshold } from '../../domain/notification-thresholds';
import { PurgeReadNotificationsResult } from './purge-read-notifications.result';

@Injectable()
export class PurgeReadNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<PurgeReadNotificationsResult> {
    const threshold = retentionThreshold(this.clock.now(), READ_RETENTION_DAYS);
    const deleted = await this.repository.deleteReadBefore(threshold);

    return { deleted };
  }
}

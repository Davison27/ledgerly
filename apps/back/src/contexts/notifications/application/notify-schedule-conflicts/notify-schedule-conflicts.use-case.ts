import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NOTIFICATION_DELIVERY, NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  NOTIFICATION_SCHEDULE_READER,
  NotificationScheduleReader,
} from '../../domain/notification-schedule-reader.port';
import { Notification } from '../../domain/notification';
import { buildConflictNotifications } from '../../domain/schedule-notification-rules';
import { NotifyScheduleConflictsCommand } from './notify-schedule-conflicts.command';

@Injectable()
export class NotifyScheduleConflictsUseCase {
  constructor(
    @Inject(NOTIFICATION_SCHEDULE_READER) private readonly scheduleReader: NotificationScheduleReader,
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY) private readonly delivery: NotificationDelivery,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: NotifyScheduleConflictsCommand): Promise<void> {
    const conflicts = await this.scheduleReader.findBlockingConflicts(command.from, command.to);
    const eventConflicts = conflicts.filter((conflict) => conflict.eventId === command.eventId);

    if (eventConflicts.length === 0) {
      return;
    }

    const now = this.clock.now();
    const candidates = buildConflictNotifications(eventConflicts).map((draft) =>
      Notification.create({
        ...draft,
        id: this.idGenerator.generate(),
        createdAt: now,
        readAt: null,
        emailSentAt: null,
      }),
    );

    const created = await this.repository.insertIfAbsent(candidates);
    await this.delivery.deliver(created);
  }
}

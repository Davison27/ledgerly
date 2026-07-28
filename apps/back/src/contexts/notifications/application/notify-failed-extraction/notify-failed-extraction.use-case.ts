import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NOTIFICATION_DELIVERY, NotificationDelivery } from '../../domain/notification-delivery.port';
import { Notification } from '../../domain/notification';
import { buildDedupeKey } from '../../domain/dedupe-key';
import { NotifyFailedExtractionCommand } from './notify-failed-extraction.command';

const MAX_DEDUPE_FILE_NAME_LENGTH = 120;

@Injectable()
export class NotifyFailedExtractionUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY) private readonly delivery: NotificationDelivery,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: NotifyFailedExtractionCommand): Promise<void> {
    const truncatedFileName = command.fileName.slice(0, MAX_DEDUPE_FILE_NAME_LENGTH);

    const notification = Notification.create({
      id: this.idGenerator.generate(),
      dedupeKey: buildDedupeKey('document_extraction_failed', truncatedFileName, String(command.fileSize)),
      type: 'document_extraction_failed',
      severity: 'warning',
      context: {
        subject: truncatedFileName,
        related: null,
        date: null,
        amount: null,
        conflictKind: null,
      },
      resource: { kind: 'none', id: null, projectId: null },
      createdAt: this.clock.now(),
      readAt: null,
      emailSentAt: null,
    });

    const created = await this.repository.insertIfAbsent([notification]);
    await this.delivery.deliver(created);
  }
}

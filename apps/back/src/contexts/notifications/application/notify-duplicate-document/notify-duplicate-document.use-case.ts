import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { NOTIFICATION_REPOSITORY, NotificationRepository } from '../../domain/notification.repository';
import { NOTIFICATION_DELIVERY, NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  DOCUMENT_DUPLICATE_DETECTOR,
  DocumentDuplicateDetector,
} from '../../domain/document-duplicate-detector.port';
import { Notification } from '../../domain/notification';
import { buildDedupeKey } from '../../domain/dedupe-key';
import { NotifyDuplicateDocumentCommand } from './notify-duplicate-document.command';

@Injectable()
export class NotifyDuplicateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_DUPLICATE_DETECTOR) private readonly duplicateDetector: DocumentDuplicateDetector,
    @Inject(NOTIFICATION_REPOSITORY) private readonly repository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY) private readonly delivery: NotificationDelivery,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: NotifyDuplicateDocumentCommand): Promise<void> {
    if (command.invoiceNumber === null) {
      return;
    }

    const hasDuplicates = await this.duplicateDetector.hasDuplicates({
      documentId: command.documentId,
      invoiceNumber: command.invoiceNumber,
      amount: command.amount,
      issuerName: command.issuerName,
      issuerTaxId: command.issuerTaxId,
    });

    if (!hasDuplicates) {
      return;
    }

    const notification = Notification.create({
      id: this.idGenerator.generate(),
      dedupeKey: buildDedupeKey('document_duplicate', command.documentId),
      type: 'document_duplicate',
      severity: 'warning',
      context: {
        subject: command.documentName,
        related: null,
        date: null,
        amount: command.amount,
        conflictKind: null,
      },
      resource: { kind: 'document', id: command.documentId, projectId: command.projectId },
      createdAt: this.clock.now(),
      readAt: null,
      emailSentAt: null,
    });

    const created = await this.repository.insertIfAbsent([notification]);
    await this.delivery.deliver(created);
  }
}

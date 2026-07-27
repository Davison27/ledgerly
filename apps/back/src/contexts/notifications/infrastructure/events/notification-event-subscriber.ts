import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
  DomainEventSubscriber,
} from '../../../../shared/domain/domain-event-publisher.port';
import { DocumentCreatedEvent } from '../../../documents/domain/events/document-created.event';
import { InvoiceExtractionFailedEvent } from '../../../documents/domain/events/invoice-extraction-failed.event';
import { ScheduleEventSavedEvent } from '../../../schedule/domain/events/schedule-event-saved.event';
import { NotifyDuplicateDocumentUseCase } from '../../application/notify-duplicate-document/notify-duplicate-document.use-case';
import { NotifyFailedExtractionUseCase } from '../../application/notify-failed-extraction/notify-failed-extraction.use-case';
import { NotifyScheduleConflictsUseCase } from '../../application/notify-schedule-conflicts/notify-schedule-conflicts.use-case';

@Injectable()
export class NotificationEventSubscriber implements DomainEventSubscriber, OnModuleInit {
  constructor(
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly publisher: DomainEventPublisher,
    private readonly notifyDuplicateDocumentUseCase: NotifyDuplicateDocumentUseCase,
    private readonly notifyFailedExtractionUseCase: NotifyFailedExtractionUseCase,
    private readonly notifyScheduleConflictsUseCase: NotifyScheduleConflictsUseCase,
  ) {}

  onModuleInit(): void {
    this.publisher.register(this);
  }

  subscribedTo(): string[] {
    return [
      DocumentCreatedEvent.EVENT_NAME,
      InvoiceExtractionFailedEvent.EVENT_NAME,
      ScheduleEventSavedEvent.EVENT_NAME,
    ];
  }

  async handle(event: DomainEvent): Promise<void> {
    switch (event.name) {
      case DocumentCreatedEvent.EVENT_NAME:
        await this.handleDocumentCreated(event as DocumentCreatedEvent);
        return;
      case InvoiceExtractionFailedEvent.EVENT_NAME:
        await this.handleExtractionFailed(event as InvoiceExtractionFailedEvent);
        return;
      case ScheduleEventSavedEvent.EVENT_NAME:
        await this.handleScheduleEventSaved(event as ScheduleEventSavedEvent);
        return;
    }
  }

  private async handleDocumentCreated(event: DocumentCreatedEvent): Promise<void> {
    await this.notifyDuplicateDocumentUseCase.execute({
      documentId: event.documentId,
      projectId: event.projectId,
      documentName: event.documentName,
      invoiceNumber: event.invoiceNumber,
      amount: event.amount,
      issuerName: event.issuerName,
      issuerTaxId: event.issuerTaxId,
    });
  }

  private async handleExtractionFailed(event: InvoiceExtractionFailedEvent): Promise<void> {
    await this.notifyFailedExtractionUseCase.execute({
      fileName: event.fileName,
      fileSize: event.fileSize,
    });
  }

  private async handleScheduleEventSaved(event: ScheduleEventSavedEvent): Promise<void> {
    const from = event.dates[0];
    const to = event.dates[event.dates.length - 1];

    await this.notifyScheduleConflictsUseCase.execute({ eventId: event.eventId, from, to });
  }
}

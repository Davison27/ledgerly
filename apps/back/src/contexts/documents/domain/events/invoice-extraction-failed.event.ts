import { DomainEvent } from '../../../../shared/domain/domain-event';

export interface InvoiceExtractionFailedEventProps {
  fileName: string;
  fileSize: number;
}

export class InvoiceExtractionFailedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'document.extractionFailed';

  readonly name = InvoiceExtractionFailedEvent.EVENT_NAME;
  readonly fileName: string;
  readonly fileSize: number;

  constructor(props: InvoiceExtractionFailedEventProps) {
    this.fileName = props.fileName;
    this.fileSize = props.fileSize;
  }
}

import { DomainEvent } from '../../../../shared/domain/domain-event';

export interface DocumentCreatedEventProps {
  documentId: string;
  projectId: string;
  documentName: string;
  invoiceNumber: string | null;
  issuerName: string | null;
  issuerTaxId: string | null;
  amount: number;
}

export class DocumentCreatedEvent implements DomainEvent {
  static readonly EVENT_NAME = 'document.created';

  readonly name = DocumentCreatedEvent.EVENT_NAME;
  readonly documentId: string;
  readonly projectId: string;
  readonly documentName: string;
  readonly invoiceNumber: string | null;
  readonly issuerName: string | null;
  readonly issuerTaxId: string | null;
  readonly amount: number;

  constructor(props: DocumentCreatedEventProps) {
    this.documentId = props.documentId;
    this.projectId = props.projectId;
    this.documentName = props.documentName;
    this.invoiceNumber = props.invoiceNumber;
    this.issuerName = props.issuerName;
    this.issuerTaxId = props.issuerTaxId;
    this.amount = props.amount;
  }
}

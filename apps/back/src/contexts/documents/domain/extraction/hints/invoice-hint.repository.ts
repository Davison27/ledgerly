import { HintAnchorKind, InvoiceHint, LearnableField } from './invoice-hint';

export interface NewInvoiceHint {
  issuerName: string;
  field: LearnableField;
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
}

export const INVOICE_HINT_REPOSITORY = Symbol('InvoiceHintRepository');

export interface InvoiceHintRepository {
  findByIssuer(issuerName: string): Promise<InvoiceHint[]>;
  findAll(): Promise<InvoiceHint[]>;
  upsert(hint: NewInvoiceHint): Promise<void>;
  delete(id: string): Promise<void>;
}

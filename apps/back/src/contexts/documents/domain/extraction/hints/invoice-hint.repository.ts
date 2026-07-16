import { HintAnchorKind, InvoiceHint, LearnableField } from './invoice-hint';

/**
 * A hint as derived by `deriveHint`, ready to be persisted. Never carries an
 * `id`: the repository assigns one only when inserting a brand new
 * (issuerTaxId, field) row; an existing row keeps its id across updates.
 */
export interface NewInvoiceHint {
  issuerTaxId: string;
  field: LearnableField;
  anchorKind: HintAnchorKind;
  anchorLabel: string;
  lineOffset: number;
  sampleValue: string;
}

export const INVOICE_HINT_REPOSITORY = Symbol('InvoiceHintRepository');

export interface InvoiceHintRepository {
  findByIssuer(issuerTaxId: string): Promise<InvoiceHint[]>;
  findAll(): Promise<InvoiceHint[]>;
  /**
   * Inserts or updates the single active hint for (issuerTaxId, field): if
   * one already exists with the same anchor, its `occurrences` counter is
   * incremented; if the anchor changed, it is replaced and the counter
   * resets to 1.
   */
  upsert(hint: NewInvoiceHint): Promise<void>;
  delete(id: string): Promise<void>;
}

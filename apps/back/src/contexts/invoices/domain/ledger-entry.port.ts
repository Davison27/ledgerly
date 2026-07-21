import { Invoice } from './invoice';
import { InvoiceIssuer } from './invoice-issuer.port';

export const LEDGER_ENTRY_PUBLISHER = Symbol('LedgerEntryPublisher');

/**
 * D1/D9 — creates the mirror `document` (direction 'ingreso') so the
 * dashboard and the project's ficha see the emitted invoice as an income
 * without the `documents` context needing to know anything about
 * `invoices`. Returns the id of the created document, to be stored back on
 * the invoice via `InvoiceRepository.linkDocument`.
 */
export interface LedgerEntryPublisher {
  publish(invoice: Invoice, issuer: InvoiceIssuer, pdf: Buffer): Promise<string>;
}

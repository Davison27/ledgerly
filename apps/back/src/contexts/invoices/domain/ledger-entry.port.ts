import { Invoice } from './invoice';
import { InvoiceIssuer } from './invoice-issuer.port';

export const LEDGER_ENTRY_PUBLISHER = Symbol('LedgerEntryPublisher');

export interface LedgerEntryPublisher {
  publish(invoice: Invoice, issuer: InvoiceIssuer, pdf: Buffer): Promise<string>;
}

import { Invoice } from './invoice';

export const INVOICE_REPOSITORY = Symbol('InvoiceRepository');

export interface InvoiceNumberAllocation {
  series: string;
  year: number;
}

export interface InvoiceRepository {
  findAll(): Promise<Invoice[]>;
  findById(id: string): Promise<Invoice | null>;
  /**
   * Assigns the definitive correlative (D2) and persists the invoice header
   * and lines inside a single transaction: `pg_advisory_xact_lock` on the
   * `(series, year)` pair, then `MAX(number)+1`, then insert. Returns the
   * invoice with its final `series`/`year`/`number` set.
   */
  saveWithNumber(invoice: Invoice, allocate: InvoiceNumberAllocation): Promise<Invoice>;
  delete(id: string): Promise<void>;
  savePdf(id: string, pdf: Buffer): Promise<void>;
  findPdf(id: string): Promise<Buffer | null>;
  linkDocument(id: string, documentId: string): Promise<void>;
}

import { Invoice } from './invoice';
import { Page, PageRequest } from '../../../shared/domain/pagination';

export const INVOICE_REPOSITORY = Symbol('InvoiceRepository');

export interface InvoiceNumberAllocation {
  series: string;
  year: number;
}

export interface InvoiceRepository {
  findAll(): Promise<Invoice[]>;
  findPage?(request: PageRequest, search?: string): Promise<Page<Invoice>>;
  findById(id: string): Promise<Invoice | null>;
  saveWithNumber(invoice: Invoice, allocate: InvoiceNumberAllocation): Promise<Invoice>;
  delete(id: string): Promise<void>;
  savePdf(id: string, pdf: Buffer): Promise<void>;
  findPdf(id: string): Promise<Buffer | null>;
  linkDocument(id: string, documentId: string): Promise<void>;
}

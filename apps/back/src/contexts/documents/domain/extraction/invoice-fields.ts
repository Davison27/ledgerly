import { DocumentCurrency } from '../document-currency';

/**
 * Fields that can be extracted, with varying degrees of confidence, from an
 * invoice PDF. All fields are optional: extractors should omit a field
 * entirely when they cannot determine it with reasonable confidence rather
 * than guessing or returning a placeholder value.
 */
export interface InvoiceFields {
  name?: string;
  date?: string;
  dueDate?: string;
  amount?: number;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  currency?: DocumentCurrency;
  invoiceNumber?: string;
  issuerName?: string;
  issuerTaxId?: string;
}

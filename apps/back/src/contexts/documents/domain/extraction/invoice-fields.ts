import { DocumentCurrency } from '../document-currency';

export interface InvoiceFields {
  name?: string;
  date?: string;
  dueDate?: string;
  amount?: number;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  currency?: DocumentCurrency;
  invoiceNumber?: string;
  issuerName?: string;
  issuerTaxId?: string;
}

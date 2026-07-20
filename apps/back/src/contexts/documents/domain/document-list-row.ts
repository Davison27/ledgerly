import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';
import { DocumentCurrency } from './document-currency';

export interface DocumentListRow {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  dueDate: string | null;
  amount: number;
  currency: DocumentCurrency;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
}

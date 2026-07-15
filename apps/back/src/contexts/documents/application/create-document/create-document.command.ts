import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';

export interface CreateDocumentCommand {
  projectId: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  issuerName?: string | null;
  issuerTaxId?: string | null;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  taxBase?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  currency?: DocumentCurrency;
}

import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';

export interface DocumentListItem {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  amount: number;
  currency: DocumentCurrency;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
}

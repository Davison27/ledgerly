import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';
import { DocumentCurrency } from '../../domain/document-currency';
import { DocumentDirection } from '../../domain/document-direction';

export interface DocumentListItem {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  direction: DocumentDirection;
  date: string;
  dueDate: string | null;
  amount: number;
  currency: DocumentCurrency;
  issuerName: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
  staffMemberId: string | null;
}

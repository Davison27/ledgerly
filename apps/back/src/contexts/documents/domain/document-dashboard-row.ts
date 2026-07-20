import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';
import { DocumentDirection } from './document-direction';

export interface DocumentDashboardRow {
  type: DocumentType;
  amount: number;
  month: number;
  status: DocumentStatus;
  issuerName: string | null;
  projectId: string;
  date: string;
  dueDate: string | null;
  taxAmount: number | null;
  direction: DocumentDirection;
}

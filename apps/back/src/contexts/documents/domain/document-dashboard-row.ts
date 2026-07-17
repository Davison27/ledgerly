import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';

export interface DocumentDashboardRow {
  type: DocumentType;
  amount: number;
  month: number;
  status: DocumentStatus;
  issuerName: string | null;
  projectId: string;
}

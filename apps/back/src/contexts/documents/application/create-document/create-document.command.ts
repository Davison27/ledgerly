import { DocumentType } from '../../domain/document-type';
import { DocumentStatus } from '../../domain/document-status';

export interface CreateDocumentCommand {
  projectId: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
}

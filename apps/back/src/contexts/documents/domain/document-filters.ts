import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';
import { DocumentDirection } from './document-direction';

export interface DocumentFilters {
  search?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  direction?: DocumentDirection;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

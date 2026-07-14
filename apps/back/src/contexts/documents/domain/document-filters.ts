import { DocumentType } from './document-type';
import { DocumentStatus } from './document-status';

export interface DocumentFilters {
  search?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

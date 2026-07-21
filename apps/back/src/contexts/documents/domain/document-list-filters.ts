import { DocumentFilters } from './document-filters';

export interface DocumentListFilters extends DocumentFilters {
  projectId?: string;
  supplierId?: string;
  staffMemberId?: string;
}

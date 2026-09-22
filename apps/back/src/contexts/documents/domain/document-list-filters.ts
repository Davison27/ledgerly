import { DocumentFilters } from './document-filters';

export interface DocumentListFilters extends DocumentFilters {
  clientId?: string;
  projectId?: string;
  supplierId?: string;
  staffMemberId?: string;
}

import { DocumentFilters } from '../../domain/document-filters';

export interface ListDocumentsQuery {
  projectId: string;
  filters: DocumentFilters;
}

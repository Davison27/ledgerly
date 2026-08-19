import { Document } from './document';
import { DocumentFilters } from './document-filters';
import { DocumentDashboardRow } from './document-dashboard-row';
import { DocumentListFilters } from './document-list-filters';
import { DocumentListRow } from './document-list-row';
import { DocumentDuplicateCriteria } from './document-duplicate-criteria';
import { DocumentDuplicateRow } from './document-duplicate-row';
import { Page, PageRequest } from '../../../shared/domain/pagination';

export const DOCUMENT_REPOSITORY = Symbol('DocumentRepository');

export interface DocumentRepository {
  findByProject(projectId: string, filters: DocumentFilters): Promise<Document[]>;
  findPageByProject?(
    projectId: string,
    filters: DocumentFilters,
    request: PageRequest,
  ): Promise<Page<Document>>;
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
  delete(id: string): Promise<void>;
  saveContent(documentId: string, content: Buffer): Promise<void>;
  findContent(documentId: string): Promise<Buffer | null>;
  findAllForDashboard(): Promise<DocumentDashboardRow[]>;
  findAllForListing(filters: DocumentListFilters): Promise<DocumentListRow[]>;
  findPageForListing?(
    filters: DocumentListFilters,
    request: PageRequest,
  ): Promise<Page<DocumentListRow>>;
  findPossibleDuplicates(criteria: DocumentDuplicateCriteria): Promise<DocumentDuplicateRow[]>;
  findPagePossibleDuplicates?(
    criteria: DocumentDuplicateCriteria,
    request: PageRequest,
  ): Promise<Page<DocumentDuplicateRow>>;
}

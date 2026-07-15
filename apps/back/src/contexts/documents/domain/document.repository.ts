import { Document } from './document';
import { DocumentFilters } from './document-filters';

export const DOCUMENT_REPOSITORY = Symbol('DocumentRepository');

export interface DocumentRepository {
  findByProject(projectId: string, filters: DocumentFilters): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
  delete(id: string): Promise<void>;
  saveContent(documentId: string, content: Buffer): Promise<void>;
  findContent(documentId: string): Promise<Buffer | null>;
}

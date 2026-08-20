import { CompanyDocument } from './company-document';

export const COMPANY_DOCUMENT_REPOSITORY = Symbol('CompanyDocumentRepository');

export interface CompanyDocumentRepository {
  findAll(typeId?: string): Promise<CompanyDocument[]>;
  findById(id: string): Promise<CompanyDocument | null>;
  save(document: CompanyDocument): Promise<void>;
  delete(id: string): Promise<boolean>;
  saveContent(documentId: string, content: Buffer): Promise<void>;
  findContent(documentId: string): Promise<Buffer | null>;
}

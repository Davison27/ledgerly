import { CompanyDocumentType } from './company-document-type';

export const COMPANY_DOCUMENT_TYPE_REPOSITORY = Symbol('CompanyDocumentTypeRepository');

export interface CompanyDocumentTypeRepository {
  findAll(): Promise<CompanyDocumentType[]>;
  findById(id: string): Promise<CompanyDocumentType | null>;
}

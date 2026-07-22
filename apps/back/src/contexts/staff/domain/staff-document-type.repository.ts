import { StaffDocumentType } from './staff-document-type';

export const STAFF_DOCUMENT_TYPE_REPOSITORY = Symbol('StaffDocumentTypeRepository');

export interface StaffDocumentTypeRepository {
  findAll(): Promise<StaffDocumentType[]>;
  findById(id: string): Promise<StaffDocumentType | null>;
}

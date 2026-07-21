import { StaffDocument } from './staff-document';

export const STAFF_DOCUMENT_REPOSITORY = Symbol('StaffDocumentRepository');

export interface StaffDocumentRepository {
  findByStaffMember(staffMemberId: string, typeId?: string): Promise<StaffDocument[]>;
  findById(id: string): Promise<StaffDocument | null>;
  save(staffDocument: StaffDocument): Promise<void>;
  delete(id: string): Promise<void>;
  saveContent(staffDocumentId: string, content: Buffer): Promise<void>;
  findContent(staffDocumentId: string): Promise<Buffer | null>;
}

import { StaffDocument } from './staff-document';

export const STAFF_DOCUMENT_REPOSITORY = Symbol('StaffDocumentRepository');

export interface StaffDocumentRepository {
  findByStaffMember(staffMemberId: string, typeId?: string): Promise<StaffDocument[]>;
  findById(id: string, staffMemberId?: string): Promise<StaffDocument | null>;
  save(staffDocument: StaffDocument): Promise<void>;
  delete(id: string, staffMemberId?: string): Promise<boolean>;
  saveContent(staffDocumentId: string, content: Buffer): Promise<void>;
  findContent(staffDocumentId: string, staffMemberId?: string): Promise<Buffer | null>;
}

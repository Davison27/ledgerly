export interface StaffMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export type StaffDocumentExpiryStatusDto = 'valid' | 'expiring' | 'expired' | 'none';

export interface StaffMemberSummaryDto extends StaffMemberDto {
  documentCount: number;
  documentStatus: StaffDocumentExpiryStatusDto;
  earliestExpiryDate: string | null;
}

export interface CreateStaffMemberPayload {
  firstName: string;
  lastName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateStaffMemberPayload {
  firstName?: string;
  lastName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  endDate?: string | null;
  notes?: string;
}

export interface StaffDocumentTypeDto {
  id: string;
  code: string;
  name: string;
  expires: boolean;
  defaultValidityMonths: number | null;
  isSystem: boolean;
}

export interface StaffDocumentDto {
  id: string;
  staffMemberId: string;
  typeId: string;
  name: string;
  issueDate: string;
  expiryDate: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateStaffDocumentPayload {
  typeId: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateStaffDocumentPayload {
  name?: string;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}

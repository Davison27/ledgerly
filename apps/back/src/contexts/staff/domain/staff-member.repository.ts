import { StaffMember } from './staff-member';

export interface StaffMemberSummaryRow {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  hireDate: string | null;
  endDate: string | null;
  notes: string | null;
  documentCount: number;
  earliestExpiryDate: string | null;
}

export const STAFF_MEMBER_REPOSITORY = Symbol('StaffMemberRepository');

export interface StaffMemberRepository {
  findAll(): Promise<StaffMember[]>;
  findAllSummaryRows(): Promise<StaffMemberSummaryRow[]>;
  findById(id: string): Promise<StaffMember | null>;
  save(staffMember: StaffMember): Promise<void>;
  delete(id: string): Promise<void>;
}

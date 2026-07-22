import { StaffMember } from './staff-member';

export const STAFF_MEMBER_REPOSITORY = Symbol('StaffMemberRepository');

export interface StaffMemberRepository {
  findAll(): Promise<StaffMember[]>;
  findById(id: string): Promise<StaffMember | null>;
  save(staffMember: StaffMember): Promise<void>;
  delete(id: string): Promise<void>;
}

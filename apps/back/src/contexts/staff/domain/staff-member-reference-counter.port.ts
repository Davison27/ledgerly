export const STAFF_MEMBER_REFERENCE_COUNTER = Symbol('StaffMemberReferenceCounter');

export interface StaffMemberReferenceCounter {
  count(staffMemberId: string): Promise<number>;
}

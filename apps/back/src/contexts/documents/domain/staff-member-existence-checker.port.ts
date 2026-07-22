export const STAFF_MEMBER_EXISTENCE_CHECKER = Symbol('StaffMemberExistenceChecker');

export interface StaffMemberExistenceChecker {
  exists(staffMemberId: string): Promise<boolean>;
}

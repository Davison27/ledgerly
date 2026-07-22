export const STAFF_PAYROLL_COUNTER = Symbol('StaffPayrollCounter');

export interface StaffPayrollCounter {
  count(staffMemberId: string): Promise<number>;
}

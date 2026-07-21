export const STAFF_PAYROLL_COUNTER = Symbol('StaffPayrollCounter');

/**
 * Cross-context read (D5): counts how many `documents` rows of type
 * `nomina` are imputed to a staff member, without importing the
 * `documents` context (same pattern as
 * `documents/domain/supplier-existence-checker.port.ts`).
 */
export interface StaffPayrollCounter {
  count(staffMemberId: string): Promise<number>;
}

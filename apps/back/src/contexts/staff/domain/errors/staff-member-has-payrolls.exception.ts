import { DomainException } from '../../../../shared/domain/domain.exception';

/**
 * D5: a staff member with payrolls imputed to them cannot be deleted —
 * `SET NULL` would violate D3 and `CASCADE` would erase real project
 * expense. `RESOURCE_IN_USE` is a new code (not `UNIQUE_CONSTRAINT`: this is
 * not a duplicate), mapped to 409 in `domain-exception.filter.ts`.
 */
export class StaffMemberHasPayrollsException extends DomainException {
  readonly code = 'RESOURCE_IN_USE';

  constructor(staffMemberId: string, payrollCount: number) {
    super(
      `Staff member with id ${staffMemberId} has ${payrollCount} payroll(s) imputed and cannot be deleted`,
    );
  }
}

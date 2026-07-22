import { DomainException } from '../../../../shared/domain/domain.exception';

export class StaffMemberHasPayrollsException extends DomainException {
  readonly code = 'RESOURCE_IN_USE';

  constructor(staffMemberId: string, payrollCount: number) {
    super(
      `Staff member with id ${staffMemberId} has ${payrollCount} payroll(s) imputed and cannot be deleted`,
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import {
  STAFF_PAYROLL_COUNTER,
  StaffPayrollCounter,
} from '../../domain/staff-payroll-counter.port';
import { StaffMemberHasPayrollsException } from '../../domain/errors/staff-member-has-payrolls.exception';

@Injectable()
export class DeleteStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(STAFF_PAYROLL_COUNTER)
    private readonly staffPayrollCounter: StaffPayrollCounter,
  ) {}

  async execute(id: string): Promise<void> {
    const payrollCount = await this.staffPayrollCounter.count(id);

    if (payrollCount > 0) {
      throw new StaffMemberHasPayrollsException(id, payrollCount);
    }

    await this.staffMemberRepository.delete(id);
  }
}

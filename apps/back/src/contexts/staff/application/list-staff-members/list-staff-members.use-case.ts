import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { classifyExpiry } from '../../domain/staff-document-expiry';
import { StaffMemberSummary } from '../../domain/staff-member-summary';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';

@Injectable()
export class ListStaffMembersUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<StaffMemberSummary[]> {
    const rows = await this.staffMemberRepository.findAllSummaryRows();
    const today = this.clock.todayIso();

    return rows.map((row) => ({
      ...row,
      documentStatus: classifyExpiry(row.earliestExpiryDate, today),
    }));
  }
}

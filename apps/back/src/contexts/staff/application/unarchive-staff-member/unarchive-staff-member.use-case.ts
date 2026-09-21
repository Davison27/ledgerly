import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';

@Injectable()
export class UnarchiveStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const staffMember = await this.staffMemberRepository.findById(id);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(id);
    }

    if (this.staffMemberRepository.unarchive === undefined) {
      throw new Error('Staff member repository does not support unarchiving');
    }

    await this.staffMemberRepository.unarchive(id);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { StaffMember } from '../../domain/staff-member';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';

@Injectable()
export class GetStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
  ) {}

  async execute(id: string): Promise<StaffMember> {
    const staffMember = await this.staffMemberRepository.findById(id);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(id);
    }

    return staffMember;
  }
}

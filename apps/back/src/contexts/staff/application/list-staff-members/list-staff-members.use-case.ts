import { Inject, Injectable } from '@nestjs/common';
import { StaffMember } from '../../domain/staff-member';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';

@Injectable()
export class ListStaffMembersUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
  ) {}

  execute(): Promise<StaffMember[]> {
    return this.staffMemberRepository.findAll();
  }
}

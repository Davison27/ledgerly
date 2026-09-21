import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import {
  STAFF_MEMBER_REFERENCE_COUNTER,
  StaffMemberReferenceCounter,
} from '../../domain/staff-member-reference-counter.port';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';

@Injectable()
export class DeleteStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(STAFF_MEMBER_REFERENCE_COUNTER)
    private readonly staffMemberReferenceCounter: StaffMemberReferenceCounter,
  ) {}

  async execute(id: string): Promise<'deleted' | 'archived'> {
    const staffMember = await this.staffMemberRepository.findById(id);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(id);
    }

    const referenceCount = await this.staffMemberReferenceCounter.count(id);

    if (referenceCount > 0) {
      await this.staffMemberRepository.archive(id);
      return 'archived';
    }

    await this.staffMemberRepository.delete(id);
    return 'deleted';
  }
}

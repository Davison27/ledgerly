import { Inject, Injectable } from '@nestjs/common';
import { StaffDocument } from '../../domain/staff-document';
import {
  STAFF_DOCUMENT_REPOSITORY,
  StaffDocumentRepository,
} from '../../domain/staff-document.repository';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';

@Injectable()
export class ListStaffDocumentsUseCase {
  constructor(
    @Inject(STAFF_DOCUMENT_REPOSITORY)
    private readonly staffDocumentRepository: StaffDocumentRepository,
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
  ) {}

  async execute(staffMemberId: string, typeId?: string): Promise<StaffDocument[]> {
    const staffMember = await this.staffMemberRepository.findById(staffMemberId);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(staffMemberId);
    }

    return this.staffDocumentRepository.findByStaffMember(staffMemberId, typeId);
  }
}

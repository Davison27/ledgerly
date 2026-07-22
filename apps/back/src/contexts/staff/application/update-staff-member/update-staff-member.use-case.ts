import { Inject, Injectable } from '@nestjs/common';
import { StaffMember, StaffMemberPrimitives } from '../../domain/staff-member';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import { StaffMemberNotFoundException } from '../../domain/errors/staff-member-not-found.exception';
import { UpdateStaffMemberCommand } from './update-staff-member.command';

type StaffMemberChanges = Partial<Omit<StaffMemberPrimitives, 'id'>>;

@Injectable()
export class UpdateStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
  ) {}

  async execute(command: UpdateStaffMemberCommand): Promise<StaffMember> {
    const staffMember = await this.staffMemberRepository.findById(command.id);

    if (staffMember === null) {
      throw new StaffMemberNotFoundException(command.id);
    }

    const changes: StaffMemberChanges = {};

    if (command.firstName !== undefined) changes.firstName = command.firstName;
    if (command.lastName !== undefined) changes.lastName = command.lastName;
    if (command.taxId !== undefined) changes.taxId = command.taxId;
    if (command.email !== undefined) changes.email = command.email;
    if (command.phone !== undefined) changes.phone = command.phone;
    if (command.position !== undefined) changes.position = command.position;
    if (command.hireDate !== undefined) changes.hireDate = command.hireDate;
    if (command.endDate !== undefined) changes.endDate = command.endDate;
    if (command.notes !== undefined) changes.notes = command.notes;

    staffMember.update(changes);

    await this.staffMemberRepository.save(staffMember);

    return staffMember;
  }
}

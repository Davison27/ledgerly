import { Inject, Injectable } from '@nestjs/common';
import { StaffMember } from '../../domain/staff-member';
import {
  STAFF_MEMBER_REPOSITORY,
  StaffMemberRepository,
} from '../../domain/staff-member.repository';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { CreateStaffMemberCommand } from './create-staff-member.command';

@Injectable()
export class CreateStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateStaffMemberCommand): Promise<StaffMember> {
    const staffMember = StaffMember.create({
      id: this.idGenerator.generate(),
      firstName: command.firstName,
      lastName: command.lastName,
      taxId: command.taxId ?? null,
      email: command.email ?? null,
      phone: command.phone ?? null,
      position: command.position ?? null,
      hireDate: command.hireDate ?? null,
      endDate: command.endDate ?? null,
      notes: command.notes ?? null,
    });

    await this.staffMemberRepository.save(staffMember);

    return staffMember;
  }
}

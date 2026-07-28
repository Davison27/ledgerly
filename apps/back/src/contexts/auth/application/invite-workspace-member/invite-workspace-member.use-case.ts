import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { MemberEmailAlreadyExistsException } from '../../domain/errors/member-email-already-exists.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { InviteWorkspaceMemberCommand } from './invite-workspace-member.command';

@Injectable()
export class InviteWorkspaceMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly repository: WorkspaceMemberRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: InviteWorkspaceMemberCommand): Promise<WorkspaceMember> {
    const email = MemberEmail.create(command.email);
    const existing = await this.repository.findByEmail(email.toValue());

    if (existing !== null) {
      throw new MemberEmailAlreadyExistsException(email.toValue());
    }

    const member = WorkspaceMember.create({
      id: this.idGenerator.generate(),
      email,
      name: command.name,
      permissions: PermissionMatrix.create(command.permissions),
      status: 'invited',
      invitedAt: this.clock.now(),
    });

    await this.repository.save(member);

    return member;
  }
}

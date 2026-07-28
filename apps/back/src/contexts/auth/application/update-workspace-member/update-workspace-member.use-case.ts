import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { LastAdminException } from '../../domain/errors/last-admin.exception';
import { SelfAccessChangeException } from '../../domain/errors/self-access-change.exception';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';
import { PermissionMatrix } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { UpdateWorkspaceMemberCommand } from './update-workspace-member.command';

function touchesAccess(command: UpdateWorkspaceMemberCommand): boolean {
  return command.permissions !== undefined || command.status !== undefined;
}

@Injectable()
export class UpdateWorkspaceMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateWorkspaceMemberCommand): Promise<WorkspaceMember> {
    const member = await this.memberRepository.findById(command.id);

    if (member === null) {
      throw new WorkspaceMemberNotFoundException(command.id);
    }

    if (command.id === command.actingMemberId && touchesAccess(command)) {
      throw new SelfAccessChangeException();
    }

    const wasActiveAdmin = member.isAdmin() && member.isActive();

    if (command.name !== undefined) {
      member.rename(command.name);
    }

    if (command.permissions !== undefined) {
      member.changePermissions(PermissionMatrix.create(command.permissions));
    }

    if (command.status !== undefined) {
      member.changeStatus(command.status);
    }

    const isActiveAdminNow = member.isAdmin() && member.isActive();

    if (wasActiveAdmin && !isActiveAdminNow) {
      const remainingActiveAdmins = await this.memberRepository.countActiveAdmins();

      if (remainingActiveAdmins <= 1) {
        throw new LastAdminException();
      }
    }

    await this.memberRepository.save(member);
    await this.sessionRepository.revokeAllForMember(member.getId(), this.clock.now());

    return member;
  }
}

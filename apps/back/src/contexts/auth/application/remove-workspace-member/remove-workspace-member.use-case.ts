import { Inject, Injectable, Logger } from '@nestjs/common';
import { LastAdminException } from '../../domain/errors/last-admin.exception';
import { SelfAccessChangeException } from '../../domain/errors/self-access-change.exception';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { AUTH_SESSION_REVOKER, AuthSessionRevoker } from '../../domain/auth-session-revoker.port';
import { RemoveWorkspaceMemberCommand } from './remove-workspace-member.command';

@Injectable()
export class RemoveWorkspaceMemberUseCase {
  private readonly logger = new Logger(RemoveWorkspaceMemberUseCase.name);

  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly repository: WorkspaceMemberRepository,
    @Inject(AUTH_SESSION_REVOKER) private readonly sessionRevoker: AuthSessionRevoker,
  ) {}

  async execute(command: RemoveWorkspaceMemberCommand): Promise<void> {
    const member = await this.repository.findById(command.id);

    if (member === null) {
      throw new WorkspaceMemberNotFoundException(command.id);
    }

    if (command.id === command.actingMemberId) {
      throw new SelfAccessChangeException();
    }

    if (member.isAdmin() && member.isActive()) {
      const remainingActiveAdmins = await this.repository.countActiveAdmins();

      if (remainingActiveAdmins <= 1) {
        throw new LastAdminException();
      }
    }

    await this.repository.delete(command.id);

    try {
      await this.sessionRevoker.revokeAllForEmail(member.getEmail());
    } catch {
      this.logger.warn('Session revocation failed after workspace member removal');
    }
  }
}

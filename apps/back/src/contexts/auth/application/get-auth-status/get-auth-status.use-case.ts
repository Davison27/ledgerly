import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { TOKEN_GENERATOR, TokenGenerator } from '../../domain/token-generator.port';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { AuthStatusResult } from './auth-status.result';
import { GetAuthStatusCommand } from './get-auth-status.command';

@Injectable()
export class GetAuthStatusUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: GetAuthStatusCommand): Promise<AuthStatusResult> {
    const bootstrapNeeded = (await this.memberRepository.countAll()) === 0;
    const authenticated = await this.resolveAuthenticated(command.sessionToken);

    return { bootstrapNeeded, authenticated };
  }

  private async resolveAuthenticated(sessionToken: string | null): Promise<boolean> {
    if (sessionToken === null) {
      return false;
    }

    const now = this.clock.now();
    const tokenHash = this.tokenGenerator.hash(sessionToken);
    const found = await this.sessionRepository.findActiveByTokenHash(tokenHash, now);

    if (found === null) {
      return false;
    }

    if (found.session.isExpired(now) || found.session.isIdle(now)) {
      return false;
    }

    return found.member.isActive();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { TOKEN_GENERATOR, TokenGenerator } from '../../domain/token-generator.port';
import { LogoutCommand } from './logout.command';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const now = this.clock.now();
    const tokenHash = this.tokenGenerator.hash(command.sessionToken);
    const found = await this.sessionRepository.findActiveByTokenHash(tokenHash, now);

    if (found !== null) {
      await this.sessionRepository.revokeById(found.session.getId(), now);
    }
  }
}

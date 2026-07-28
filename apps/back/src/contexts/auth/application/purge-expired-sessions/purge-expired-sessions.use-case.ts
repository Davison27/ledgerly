import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { LOGIN_ATTEMPT_REPOSITORY, LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { SESSION_REPOSITORY, SessionRepository } from '../../domain/session.repository';
import { PurgeExpiredSessionsResult } from './purge-expired-sessions.result';

@Injectable()
export class PurgeExpiredSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(LOGIN_ATTEMPT_REPOSITORY) private readonly loginAttemptRepository: LoginAttemptRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<PurgeExpiredSessionsResult> {
    const now = this.clock.now();
    const deletedSessions = await this.sessionRepository.deleteExpired(now);
    const deletedLoginAttempts = await this.loginAttemptRepository.deleteExpired(now);

    return { deletedSessions, deletedLoginAttempts };
  }
}

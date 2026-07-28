import { PurgeExpiredSessionsUseCase } from './purge-expired-sessions.use-case';
import { LoginAttemptRepository } from '../../domain/login-attempt.repository';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { LoginAttempt } from '../../domain/login-attempt';
import { Clock } from '../../../../shared/domain/clock.port';

class FakeSessionRepository implements SessionRepository {
  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  revokeById(): Promise<void> {
    return Promise.resolve();
  }

  revokeAllForMember(): Promise<void> {
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(3);
  }
}

class FakeLoginAttemptRepository implements LoginAttemptRepository {
  save(): Promise<void> {
    return Promise.resolve();
  }

  consumeByTransactionHash(): Promise<LoginAttempt | null> {
    return Promise.resolve(null);
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(5);
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

describe('PurgeExpiredSessionsUseCase', () => {
  it('purges expired sessions and login attempts and returns the counts', async () => {
    const useCase = new PurgeExpiredSessionsUseCase(
      new FakeSessionRepository(),
      new FakeLoginAttemptRepository(),
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    );

    const result = await useCase.execute();

    expect(result).toEqual({ deletedSessions: 3, deletedLoginAttempts: 5 });
  });
});

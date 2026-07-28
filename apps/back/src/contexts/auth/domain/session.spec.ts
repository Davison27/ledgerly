import { Session } from './session';
import { SESSION_ABSOLUTE_TTL_MINUTES, SESSION_IDLE_TTL_MINUTES } from './session-policy';

describe('Session', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  function createSession(): Session {
    return Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'a'.repeat(64),
      csrfHash: 'b'.repeat(64),
      now,
    });
  }

  it('is not expired before the absolute TTL elapses', () => {
    const session = createSession();
    const almostExpired = new Date(now.getTime() + (SESSION_ABSOLUTE_TTL_MINUTES - 1) * 60_000);

    expect(session.isExpired(almostExpired)).toBe(false);
  });

  it('is expired once the absolute TTL elapses', () => {
    const session = createSession();
    const afterExpiry = new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MINUTES * 60_000);

    expect(session.isExpired(afterExpiry)).toBe(true);
  });

  it('is not idle before the idle TTL elapses', () => {
    const session = createSession();
    const almostIdle = new Date(now.getTime() + (SESSION_IDLE_TTL_MINUTES - 1) * 60_000);

    expect(session.isIdle(almostIdle)).toBe(false);
  });

  it('is idle once the idle TTL elapses since the last touch', () => {
    const session = createSession();
    const idle = new Date(now.getTime() + SESSION_IDLE_TTL_MINUTES * 60_000);

    expect(session.isIdle(idle)).toBe(true);
  });

  it('resets idleness after touch', () => {
    const session = createSession();
    const touchedAt = new Date(now.getTime() + 60 * 60_000);
    session.touch(touchedAt);

    const stillActive = new Date(touchedAt.getTime() + (SESSION_IDLE_TTL_MINUTES - 1) * 60_000);

    expect(session.isIdle(stillActive)).toBe(false);
  });

  it('is revoked once revoke() is called', () => {
    const session = createSession();

    expect(session.isRevoked()).toBe(false);

    session.revoke(now);

    expect(session.isRevoked()).toBe(true);
  });

  it('matches the stored csrf hash', () => {
    const session = createSession();

    expect(session.matchesCsrfHash('b'.repeat(64))).toBe(true);
    expect(session.matchesCsrfHash('c'.repeat(64))).toBe(false);
  });
});

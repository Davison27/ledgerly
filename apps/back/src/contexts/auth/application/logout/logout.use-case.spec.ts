import { LogoutUseCase } from './logout.use-case';
import { Session } from '../../domain/session';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { TokenGenerator } from '../../domain/token-generator.port';
import { WorkspaceMember } from '../../domain/workspace-member';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { Clock } from '../../../../shared/domain/clock.port';

class InMemorySessionRepository implements SessionRepository {
  revokedIds: string[] = [];

  constructor(private readonly entry: SessionWithMember | null) {}

  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(this.entry);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  revokeById(id: string): Promise<void> {
    this.revokedIds.push(id);
    return Promise.resolve();
  }

  revokeAllForMember(): Promise<void> {
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

class FakeTokenGenerator implements TokenGenerator {
  generateOpaqueToken(): string {
    return 'token';
  }

  hash(value: string): string {
    return `hash(${value})`;
  }

  hashesMatch(hash: string, candidate: string): boolean {
    return hash === candidate;
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

const NOW = new Date('2026-01-10T00:00:00.000Z');

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function member(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('person@ledgerly.dev'),
    name: 'Person',
    permissions: viewerMatrix(),
    status: 'active',
    invitedAt: NOW,
  });
}

describe('LogoutUseCase', () => {
  it('revokes the session behind the given token', async () => {
    const session = Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'csrf-hash',
      now: NOW,
    });
    const repository = new InMemorySessionRepository({ session, member: member() });
    const useCase = new LogoutUseCase(repository, new FakeTokenGenerator(), new FixedClock(NOW));

    await useCase.execute({ sessionToken: 'token' });

    expect(repository.revokedIds).toEqual(['session-1']);
  });

  it('does nothing when there is no active session for the token', async () => {
    const repository = new InMemorySessionRepository(null);
    const useCase = new LogoutUseCase(repository, new FakeTokenGenerator(), new FixedClock(NOW));

    await useCase.execute({ sessionToken: 'unknown-token' });

    expect(repository.revokedIds).toEqual([]);
  });
});

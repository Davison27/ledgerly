import { GetAuthStatusUseCase } from './get-auth-status.use-case';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { Session } from '../../domain/session';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { TokenGenerator } from '../../domain/token-generator.port';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { Clock } from '../../../../shared/domain/clock.port';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(private readonly members: WorkspaceMember[]) {}

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(id: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getId() === id) ?? null);
  }

  findByEmail(email: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getEmail() === email) ?? null);
  }

  findByGoogleSubject(subject: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getGoogleSubject() === subject) ?? null);
  }

  countAll(): Promise<number> {
    return Promise.resolve(this.members.length);
  }

  countActiveAdmins(): Promise<number> {
    return Promise.resolve(this.members.filter((member) => member.isAdmin() && member.isActive()).length);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  insertFounder(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  touchLastActive(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly entry: SessionWithMember | null) {}

  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(this.entry);
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

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function activeMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('person@ledgerly.dev'),
    name: 'Person',
    permissions: viewerMatrix(),
    status: 'active',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('GetAuthStatusUseCase', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');

  it('reports bootstrapNeeded when there are no members', async () => {
    const useCase = new GetAuthStatusUseCase(
      new InMemoryWorkspaceMemberRepository([]),
      new InMemorySessionRepository(null),
      new FakeTokenGenerator(),
      new FixedClock(now),
    );

    const result = await useCase.execute({ sessionToken: null });

    expect(result.bootstrapNeeded).toBe(true);
    expect(result.authenticated).toBe(false);
  });

  it('reports authenticated when the session token resolves to an active member', async () => {
    const session = Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'csrf-hash',
      now,
    });

    const useCase = new GetAuthStatusUseCase(
      new InMemoryWorkspaceMemberRepository([activeMember()]),
      new InMemorySessionRepository({ session, member: activeMember() }),
      new FakeTokenGenerator(),
      new FixedClock(now),
    );

    const result = await useCase.execute({ sessionToken: 'token' });

    expect(result.bootstrapNeeded).toBe(false);
    expect(result.authenticated).toBe(true);
  });

  it('reports not authenticated when there is no session token', async () => {
    const useCase = new GetAuthStatusUseCase(
      new InMemoryWorkspaceMemberRepository([activeMember()]),
      new InMemorySessionRepository(null),
      new FakeTokenGenerator(),
      new FixedClock(now),
    );

    const result = await useCase.execute({ sessionToken: null });

    expect(result.authenticated).toBe(false);
  });
});

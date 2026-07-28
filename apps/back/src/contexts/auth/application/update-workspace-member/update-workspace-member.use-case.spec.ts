import { UpdateWorkspaceMemberUseCase } from './update-workspace-member.use-case';
import { LastAdminException } from '../../domain/errors/last-admin.exception';
import { SelfAccessChangeException } from '../../domain/errors/self-access-change.exception';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { SessionRepository, SessionWithMember } from '../../domain/session.repository';
import { Clock } from '../../../../shared/domain/clock.port';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  saved: WorkspaceMember[] = [];

  constructor(private members: WorkspaceMember[]) {}

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(id: string): Promise<WorkspaceMember | null> {
    const member = this.members.find((existing) => existing.getId() === id);
    return Promise.resolve(member ? WorkspaceMember.fromPrimitives(member.toPrimitives()) : null);
  }

  findByEmail(): Promise<WorkspaceMember | null> {
    return Promise.resolve(null);
  }

  findByGoogleSubject(): Promise<WorkspaceMember | null> {
    return Promise.resolve(null);
  }

  countAll(): Promise<number> {
    return Promise.resolve(this.members.length);
  }

  countActiveAdmins(): Promise<number> {
    return Promise.resolve(this.members.filter((member) => member.isAdmin() && member.isActive()).length);
  }

  save(member: WorkspaceMember): Promise<void> {
    this.saved.push(member);
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
  revokedMemberIds: string[] = [];

  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  revokeById(): Promise<void> {
    return Promise.resolve();
  }

  revokeAllForMember(memberId: string): Promise<void> {
    this.revokedMemberIds.push(memberId);
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
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

function adminMatrix(): PermissionMatrix {
  return PermissionMatrix.admin();
}

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function adminMember(id: string): WorkspaceMember {
  return WorkspaceMember.create({
    id,
    email: MemberEmail.create(`${id}@ledgerly.dev`),
    name: 'Admin',
    permissions: adminMatrix(),
    status: 'active',
    invitedAt: NOW,
  });
}

describe('UpdateWorkspaceMemberUseCase', () => {
  it('throws when the target member does not exist', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    await expect(
      useCase.execute({ id: 'missing', actingMemberId: 'admin-1', name: 'New Name' }),
    ).rejects.toThrow(WorkspaceMemberNotFoundException);
  });

  it('rejects changing your own permissions or status', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1'), adminMember('admin-2')]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    await expect(
      useCase.execute({ id: 'admin-1', actingMemberId: 'admin-1', status: 'disabled' }),
    ).rejects.toThrow(SelfAccessChangeException);
  });

  it('allows changing your own name', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    const updated = await useCase.execute({ id: 'admin-1', actingMemberId: 'admin-1', name: 'New Name' });

    expect(updated.getName()).toBe('New Name');
  });

  it('rejects disabling the last active admin', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    await expect(
      useCase.execute({ id: 'admin-1', actingMemberId: 'other-actor', status: 'disabled' }),
    ).rejects.toThrow(LastAdminException);
  });

  it('allows disabling an admin when another active admin remains, and revokes sessions', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1'), adminMember('admin-2')]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    const updated = await useCase.execute({ id: 'admin-1', actingMemberId: 'other-actor', status: 'disabled' });

    expect(updated.getStatus()).toBe('disabled');
    expect(sessionRepository.revokedMemberIds).toEqual(['admin-1']);
  });

  it('allows demoting an admin to viewer when another admin remains', async () => {
    const memberRepository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1'), adminMember('admin-2')]);
    const sessionRepository = new InMemorySessionRepository();
    const useCase = new UpdateWorkspaceMemberUseCase(memberRepository, sessionRepository, new FixedClock(NOW));

    const updated = await useCase.execute({
      id: 'admin-1',
      actingMemberId: 'other-actor',
      permissions: viewerMatrix().toPrimitives(),
    });

    expect(updated.getRole()).toBe('viewer');
  });
});

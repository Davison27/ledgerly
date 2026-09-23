import { RemoveWorkspaceMemberUseCase } from './remove-workspace-member.use-case';
import { LastAdminException } from '../../domain/errors/last-admin.exception';
import { SelfAccessChangeException } from '../../domain/errors/self-access-change.exception';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { AuthSessionRevoker } from '../../domain/auth-session-revoker.port';

class InMemorySessionRevoker implements AuthSessionRevoker {
  revokedEmails: string[] = [];

  constructor(
    private readonly operations: string[] = [],
    private readonly failure: Error | null = null,
  ) {}

  revokeAllForEmail(email: string): Promise<void> {
    this.operations.push('revoke');
    if (this.failure) return Promise.reject(this.failure);
    this.revokedEmails.push(email);
    return Promise.resolve();
  }
}

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  disabledIds: string[] = [];

  constructor(
    private members: WorkspaceMember[],
    private readonly operations: string[] = [],
  ) {}

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(id: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getId() === id) ?? null);
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
    return Promise.resolve(
      this.members.filter((member) => member.isAdmin() && member.isActive()).length,
    );
  }

  save(member: WorkspaceMember): Promise<void> {
    this.operations.push('save');
    this.disabledIds.push(member.getId());
    return Promise.resolve();
  }

  insertFounder(): Promise<void> {
    return Promise.resolve();
  }

  touchLastActive(): Promise<void> {
    return Promise.resolve();
  }
}

function adminMember(id: string): WorkspaceMember {
  return WorkspaceMember.create({
    id,
    email: MemberEmail.create(`${id}@ledgerly.dev`),
    name: 'Admin',
    role: 'admin',
    permissions: PermissionMatrix.admin(),
    status: 'active',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function viewerMember(id: string): WorkspaceMember {
  return WorkspaceMember.create({
    id,
    email: MemberEmail.create(`${id}@ledgerly.dev`),
    name: 'Viewer',
    role: 'member',
    permissions: PermissionMatrix.create(
      WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
        matrix[module] = 'view';
        return matrix;
      }, {}),
    ),
    status: 'active',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('RemoveWorkspaceMemberUseCase', () => {
  it('throws when the member does not exist', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository, new InMemorySessionRevoker());

    await expect(useCase.execute({ id: 'missing', actingMemberId: 'admin-1' })).rejects.toThrow(
      WorkspaceMemberNotFoundException,
    );
  });

  it('rejects removing yourself', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository, new InMemorySessionRevoker());

    await expect(useCase.execute({ id: 'admin-1', actingMemberId: 'admin-1' })).rejects.toThrow(
      SelfAccessChangeException,
    );
  });

  it('rejects removing the last active admin', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository, new InMemorySessionRevoker());

    await expect(useCase.execute({ id: 'admin-1', actingMemberId: 'other-actor' })).rejects.toThrow(
      LastAdminException,
    );
    expect(repository.disabledIds).toEqual([]);
  });

  it('removes a viewer without touching the admin count', async () => {
    const operations: string[] = [];
    const repository = new InMemoryWorkspaceMemberRepository(
      [adminMember('admin-1'), viewerMember('viewer-1')],
      operations,
    );
    const sessionRevoker = new InMemorySessionRevoker(operations);
    const useCase = new RemoveWorkspaceMemberUseCase(repository, sessionRevoker);

    await useCase.execute({ id: 'viewer-1', actingMemberId: 'admin-1' });

    expect(repository.disabledIds).toEqual(['viewer-1']);
    expect((await repository.findById('viewer-1'))?.getStatus()).toBe('disabled');
    expect(sessionRevoker.revokedEmails).toEqual(['viewer-1@ledgerly.dev']);
    expect(operations).toEqual(['save', 'revoke']);
  });

  it('removes an admin when another active admin remains', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([
      adminMember('admin-1'),
      adminMember('admin-2'),
    ]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository, new InMemorySessionRevoker());

    await useCase.execute({ id: 'admin-1', actingMemberId: 'admin-2' });

    expect(repository.disabledIds).toEqual(['admin-1']);
  });

  it('keeps the member disabled when session revocation fails', async () => {
    const operations: string[] = [];
    const repository = new InMemoryWorkspaceMemberRepository(
      [adminMember('admin-1'), viewerMember('viewer-1')],
      operations,
    );
    const sessionRevoker = new InMemorySessionRevoker(
      operations,
      new Error('session revocation failed'),
    );
    const useCase = new RemoveWorkspaceMemberUseCase(repository, sessionRevoker);

    await expect(
      useCase.execute({ id: 'viewer-1', actingMemberId: 'admin-1' }),
    ).resolves.toBeUndefined();
    expect(repository.disabledIds).toEqual(['viewer-1']);
    expect((await repository.findById('viewer-1'))?.getStatus()).toBe('disabled');
    expect(operations).toEqual(['save', 'revoke']);
  });
});

import { RemoveWorkspaceMemberUseCase } from './remove-workspace-member.use-case';
import { LastAdminException } from '../../domain/errors/last-admin.exception';
import { SelfAccessChangeException } from '../../domain/errors/self-access-change.exception';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  deletedIds: string[] = [];

  constructor(private members: WorkspaceMember[]) {}

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
    return Promise.resolve(this.members.filter((member) => member.isAdmin() && member.isActive()).length);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  insertFounder(): Promise<void> {
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.deletedIds.push(id);
    this.members = this.members.filter((member) => member.getId() !== id);
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
    const useCase = new RemoveWorkspaceMemberUseCase(repository);

    await expect(useCase.execute({ id: 'missing', actingMemberId: 'admin-1' })).rejects.toThrow(
      WorkspaceMemberNotFoundException,
    );
  });

  it('rejects removing yourself', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository);

    await expect(useCase.execute({ id: 'admin-1', actingMemberId: 'admin-1' })).rejects.toThrow(
      SelfAccessChangeException,
    );
  });

  it('rejects removing the last active admin', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository);

    await expect(useCase.execute({ id: 'admin-1', actingMemberId: 'other-actor' })).rejects.toThrow(
      LastAdminException,
    );
    expect(repository.deletedIds).toEqual([]);
  });

  it('removes a viewer without touching the admin count', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1'), viewerMember('viewer-1')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository);

    await useCase.execute({ id: 'viewer-1', actingMemberId: 'admin-1' });

    expect(repository.deletedIds).toEqual(['viewer-1']);
  });

  it('removes an admin when another active admin remains', async () => {
    const repository = new InMemoryWorkspaceMemberRepository([adminMember('admin-1'), adminMember('admin-2')]);
    const useCase = new RemoveWorkspaceMemberUseCase(repository);

    await useCase.execute({ id: 'admin-1', actingMemberId: 'admin-2' });

    expect(repository.deletedIds).toEqual(['admin-1']);
  });
});

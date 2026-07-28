import { ListWorkspaceMembersUseCase } from './list-workspace-members.use-case';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(private readonly members: WorkspaceMember[]) {}

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(): Promise<WorkspaceMember | null> {
    return Promise.resolve(null);
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
    return Promise.resolve(0);
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

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

describe('ListWorkspaceMembersUseCase', () => {
  it('returns every member from the repository', async () => {
    const member = WorkspaceMember.create({
      id: 'member-1',
      email: MemberEmail.create('person@ledgerly.dev'),
      name: 'Person',
      permissions: viewerMatrix(),
      status: 'active',
      invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const useCase = new ListWorkspaceMembersUseCase(new InMemoryWorkspaceMemberRepository([member]));

    const members = await useCase.execute();

    expect(members).toEqual([member]);
  });
});

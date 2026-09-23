import { InviteWorkspaceMemberUseCase } from './invite-workspace-member.use-case';
import { MemberEmailAlreadyExistsException } from '../../domain/errors/member-email-already-exists.exception';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix } from '../../domain/value-objects/permission-matrix';
import { WORKSPACE_MODULES } from '../../domain/value-objects/permission-matrix';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  members: WorkspaceMember[] = [];

  findAll(): Promise<WorkspaceMember[]> {
    return Promise.resolve(this.members);
  }

  findById(id: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getId() === id) ?? null);
  }

  findByEmail(email: string): Promise<WorkspaceMember | null> {
    return Promise.resolve(this.members.find((member) => member.getEmail() === email) ?? null);
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

  save(member: WorkspaceMember): Promise<void> {
    this.members.push(member);
    return Promise.resolve();
  }

  insertFounder(): Promise<void> {
    return Promise.resolve();
  }

  touchLastActive(): Promise<void> {
    return Promise.resolve();
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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `member-${this.nextId++}`;
  }
}

function viewerPermissions(): Record<string, string> {
  return WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
    matrix[module] = 'view';
    return matrix;
  }, {});
}

describe('InviteWorkspaceMemberUseCase', () => {
  function buildUseCase(
    repository: InMemoryWorkspaceMemberRepository,
  ): InviteWorkspaceMemberUseCase {
    return new InviteWorkspaceMemberUseCase(
      repository,
      new SequentialIdGenerator(),
      new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    );
  }

  it('invites a new member with the explicit role and invited status', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);

    const member = await useCase.execute({
      name: 'Jane Doe',
      email: 'Jane@Ledgerly.dev',
      role: 'member',
      permissions: viewerPermissions(),
    });

    expect(member.getEmail()).toBe('jane@ledgerly.dev');
    expect(member.getRole()).toBe('member');
    expect(member.getStatus()).toBe('invited');
    expect(repository.members).toHaveLength(1);
  });

  it('rejects an email that already belongs to another member', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);
    await useCase.execute({
      name: 'Jane Doe',
      email: 'jane@ledgerly.dev',
      role: 'member',
      permissions: viewerPermissions(),
    });

    await expect(
      useCase.execute({
        name: 'Jane Again',
        email: 'jane@ledgerly.dev',
        role: 'member',
        permissions: viewerPermissions(),
      }),
    ).rejects.toThrow(MemberEmailAlreadyExistsException);
    expect(repository.members).toHaveLength(1);
  });

  it('keeps a disabled member email reserved for the retained identity', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const disabledMember = WorkspaceMember.create({
      id: 'retained-member',
      email: MemberEmail.create('jane@ledgerly.dev'),
      name: 'Jane Doe',
      role: 'member',
      permissions: PermissionMatrix.create(viewerPermissions()),
      status: 'disabled',
      invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    repository.members.push(disabledMember);
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Jane Again',
        email: 'jane@ledgerly.dev',
        role: 'member',
        permissions: viewerPermissions(),
      }),
    ).rejects.toThrow(MemberEmailAlreadyExistsException);
    expect(repository.members).toHaveLength(1);
    expect(repository.members[0].getId()).toBe('retained-member');
  });

  it('keeps an invited administrator independent from section permissions', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);

    const member = await useCase.execute({
      name: 'Jane Doe',
      email: 'jane@ledgerly.dev',
      role: 'admin',
      permissions: viewerPermissions(),
    });

    expect(member.getRole()).toBe('admin');
    expect(member.canAccess('documents', 'edit')).toBe(true);
  });
});

import { BootstrapFirstAdminUseCase } from './bootstrap-first-admin.use-case';
import { BootstrapUnavailableException } from '../../domain/errors/bootstrap-unavailable.exception';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryWorkspaceMemberRepository implements WorkspaceMemberRepository {
  members: WorkspaceMember[] = [];
  shouldRaceOnInsert = false;

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

  insertFounder(member: WorkspaceMember): Promise<void> {
    if (this.shouldRaceOnInsert) {
      return Promise.reject(new UniqueConstraintException('WorkspaceMember', 'is_founder', 'true'));
    }

    this.members.push(member);
    return Promise.resolve();
  }

  delete(): Promise<void> {
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

function buildUseCase(repository: InMemoryWorkspaceMemberRepository): BootstrapFirstAdminUseCase {
  return new BootstrapFirstAdminUseCase(
    repository,
    new SequentialIdGenerator(),
    new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    'founder@ledgerly.dev',
  );
}

describe('BootstrapFirstAdminUseCase', () => {
  it('creates the founder as an invited admin when the email matches', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);

    const founder = await useCase.execute({ email: 'Founder@Ledgerly.dev' });

    expect(founder.getEmail()).toBe('founder@ledgerly.dev');
    expect(founder.getRole()).toBe('admin');
    expect(founder.getStatus()).toBe('invited');
    expect(founder.isFounder()).toBe(true);
    expect(repository.members).toHaveLength(1);
  });

  it('rejects an email that does not match BOOTSTRAP_ADMIN_EMAIL', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);

    await expect(useCase.execute({ email: 'someone-else@ledgerly.dev' })).rejects.toThrow(
      BootstrapUnavailableException,
    );
    expect(repository.members).toHaveLength(0);
  });

  it('rejects the correct email when a member already exists', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    const useCase = buildUseCase(repository);
    await useCase.execute({ email: 'founder@ledgerly.dev' });

    await expect(useCase.execute({ email: 'founder@ledgerly.dev' })).rejects.toThrow(
      BootstrapUnavailableException,
    );
    expect(repository.members).toHaveLength(1);
  });

  it('translates a unique-constraint race at insert time into BootstrapUnavailableException', async () => {
    const repository = new InMemoryWorkspaceMemberRepository();
    repository.shouldRaceOnInsert = true;
    const useCase = buildUseCase(repository);

    await expect(useCase.execute({ email: 'founder@ledgerly.dev' })).rejects.toThrow(
      BootstrapUnavailableException,
    );
  });
});

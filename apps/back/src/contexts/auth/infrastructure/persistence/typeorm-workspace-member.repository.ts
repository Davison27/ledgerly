import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { WorkspaceMemberMapper } from './workspace-member.mapper';
import { WorkspaceMemberOrmEntity } from './workspace-member.orm-entity';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';

const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
      POSTGRES_UNIQUE_VIOLATION
  );
}

function getUniqueConstraint(error: unknown): string | undefined {
  if (!isUniqueViolation(error)) return undefined;

  return (error as QueryFailedError & { driverError?: { constraint?: string } }).driverError?.constraint;
}

@Injectable()
export class TypeOrmWorkspaceMemberRepository implements WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMemberOrmEntity)
    private readonly repository: Repository<WorkspaceMemberOrmEntity>,
  ) {}

  async findAll(): Promise<WorkspaceMember[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const orms = await this.repository.find({ order: { invitedAt: 'ASC' }, take: limit + 1 });

    if (orms.length > limit) throw new ListLimitExceededException(limit, 'Workspace members');

    return orms.map((orm) => WorkspaceMemberMapper.toDomain(orm));
  }

  async findById(id: string): Promise<WorkspaceMember | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm ? WorkspaceMemberMapper.toDomain(orm) : null;
  }

  async findByEmail(email: string): Promise<WorkspaceMember | null> {
    const orm = await this.repository.findOne({ where: { email } });

    return orm ? WorkspaceMemberMapper.toDomain(orm) : null;
  }

  async findByGoogleSubject(subject: string): Promise<WorkspaceMember | null> {
    const orm = await this.repository.findOne({ where: { googleSubject: subject } });

    return orm ? WorkspaceMemberMapper.toDomain(orm) : null;
  }

  async countAll(): Promise<number> {
    return this.repository.count();
  }

  async countActiveAdmins(): Promise<number> {
    return this.repository.count({ where: { role: 'admin', status: 'active' } });
  }

  async save(member: WorkspaceMember): Promise<void> {
    await this.repository.save(WorkspaceMemberMapper.toOrm(member));
  }

  async insertFounder(member: WorkspaceMember): Promise<void> {
    try {
      await this.repository.insert(WorkspaceMemberMapper.toOrm(member));
    } catch (error) {
      switch (getUniqueConstraint(error)) {
        case 'UQ_workspace_members_founder':
          throw new UniqueConstraintException('WorkspaceMember', 'is_founder', 'true');
        case 'UQ_workspace_members_email':
          throw new UniqueConstraintException('WorkspaceMember', 'email', member.getEmail());
        case 'UQ_workspace_members_google_subject':
          throw new UniqueConstraintException(
            'WorkspaceMember',
            'google_subject',
            member.getGoogleSubject() ?? '',
          );
        default:
          throw error;
      }
    }
  }

  async touchLastActive(memberId: string, at: Date): Promise<void> {
    await this.repository.update({ id: memberId }, { lastActiveAt: at });
  }
}

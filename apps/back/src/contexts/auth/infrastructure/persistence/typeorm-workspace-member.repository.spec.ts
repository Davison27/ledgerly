import { QueryFailedError, Repository } from 'typeorm';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { TypeOrmWorkspaceMemberRepository } from './typeorm-workspace-member.repository';
import { WorkspaceMemberOrmEntity } from './workspace-member.orm-entity';

function buildMember(googleSubject: string | null = null): WorkspaceMember {
  return WorkspaceMember.create({
    id: '00000000-0000-0000-0000-000000000001',
    email: MemberEmail.create('founder@example.com'),
    googleSubject,
    name: 'Founder',
    permissions: PermissionMatrix.admin(),
    isFounder: true,
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function uniqueViolation(constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT INTO workspace_members', [], {
    code: '23505',
    constraint,
  } as unknown as Error);
}

describe('TypeOrmWorkspaceMemberRepository.insertFounder', () => {
  it.each([
    ['UQ_workspace_members_founder', 'is_founder', 'true', null],
    ['UQ_workspace_members_email', 'email', 'founder@example.com', null],
    ['UQ_workspace_members_google_subject', 'google_subject', 'google-1', 'google-1'],
  ])('maps %s to a field-specific unique constraint', async (constraint, field, value, googleSubject) => {
    const insert = jest.fn().mockRejectedValue(uniqueViolation(constraint));
    const repository = new TypeOrmWorkspaceMemberRepository({ insert } as unknown as Repository<WorkspaceMemberOrmEntity>);

    await expect(repository.insertFounder(buildMember(googleSubject))).rejects.toEqual(
      new UniqueConstraintException('WorkspaceMember', field, value),
    );
  });

  it('rethrows an unrelated unique constraint', async () => {
    const error = uniqueViolation('UQ_workspace_members_other');
    const insert = jest.fn().mockRejectedValue(error);
    const repository = new TypeOrmWorkspaceMemberRepository({ insert } as unknown as Repository<WorkspaceMemberOrmEntity>);

    await expect(repository.insertFounder(buildMember())).rejects.toBe(error);
  });
});

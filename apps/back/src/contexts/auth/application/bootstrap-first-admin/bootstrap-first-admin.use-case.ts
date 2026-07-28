import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ID_GENERATOR, IdGenerator } from '../../../../shared/domain/id-generator.port';
import { UniqueConstraintException } from '../../../../shared/domain/unique-constraint.exception';
import { BootstrapUnavailableException } from '../../domain/errors/bootstrap-unavailable.exception';
import { MemberEmail } from '../../domain/value-objects/member-email';
import { PermissionMatrix } from '../../domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { BootstrapFirstAdminCommand } from './bootstrap-first-admin.command';

export const BOOTSTRAP_ADMIN_EMAIL = Symbol('BootstrapAdminEmail');

@Injectable()
export class BootstrapFirstAdminUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly repository: WorkspaceMemberRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BOOTSTRAP_ADMIN_EMAIL) private readonly bootstrapAdminEmail: string,
  ) {}

  async execute(command: BootstrapFirstAdminCommand): Promise<WorkspaceMember> {
    const email = MemberEmail.create(command.email);
    const allowedEmail = MemberEmail.create(this.bootstrapAdminEmail);

    if (email.toValue() !== allowedEmail.toValue()) {
      throw new BootstrapUnavailableException();
    }

    const existingCount = await this.repository.countAll();

    if (existingCount > 0) {
      throw new BootstrapUnavailableException();
    }

    const founder = WorkspaceMember.create({
      id: this.idGenerator.generate(),
      email,
      name: command.email.split('@')[0],
      permissions: PermissionMatrix.admin(),
      status: 'invited',
      isFounder: true,
      invitedAt: this.clock.now(),
    });

    try {
      await this.repository.insertFounder(founder);
    } catch (error) {
      if (error instanceof UniqueConstraintException) {
        throw new BootstrapUnavailableException();
      }

      throw error;
    }

    return founder;
  }
}

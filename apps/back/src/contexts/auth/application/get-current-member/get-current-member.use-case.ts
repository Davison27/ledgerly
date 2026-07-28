import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { WorkspaceMemberNotFoundException } from '../../domain/errors/workspace-member-not-found.exception';

@Injectable()
export class GetCurrentMemberUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly repository: WorkspaceMemberRepository,
  ) {}

  async execute(id: string): Promise<WorkspaceMember> {
    const member = await this.repository.findById(id);

    if (member === null) {
      throw new WorkspaceMemberNotFoundException(id);
    }

    return member;
  }
}

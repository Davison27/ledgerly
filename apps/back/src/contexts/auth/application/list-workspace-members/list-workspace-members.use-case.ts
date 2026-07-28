import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';

@Injectable()
export class ListWorkspaceMembersUseCase {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly repository: WorkspaceMemberRepository,
  ) {}

  execute(): Promise<WorkspaceMember[]> {
    return this.repository.findAll();
  }
}

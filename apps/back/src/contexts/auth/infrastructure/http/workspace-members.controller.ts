import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { InviteWorkspaceMemberUseCase } from '../../application/invite-workspace-member/invite-workspace-member.use-case';
import { ListWorkspaceMembersUseCase } from '../../application/list-workspace-members/list-workspace-members.use-case';
import { RemoveWorkspaceMemberUseCase } from '../../application/remove-workspace-member/remove-workspace-member.use-case';
import { UpdateWorkspaceMemberUseCase } from '../../application/update-workspace-member/update-workspace-member.use-case';
import { WorkspaceMember } from '../../domain/workspace-member';
import { InviteWorkspaceMemberDto } from './dtos/invite-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dtos/update-workspace-member.dto';
import { WorkspaceMemberResponse } from './workspace-member.response';

@RequiresAdmin()
@Controller('workspace/members')
export class WorkspaceMembersController {
  constructor(
    private readonly listWorkspaceMembersUseCase: ListWorkspaceMembersUseCase,
    private readonly inviteWorkspaceMemberUseCase: InviteWorkspaceMemberUseCase,
    private readonly updateWorkspaceMemberUseCase: UpdateWorkspaceMemberUseCase,
    private readonly removeWorkspaceMemberUseCase: RemoveWorkspaceMemberUseCase,
  ) {}

  @Get()
  async list(): Promise<WorkspaceMemberResponse[]> {
    const members = await this.listWorkspaceMembersUseCase.execute();

    return members.map((member) => WorkspaceMemberResponse.fromDomain(member));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async invite(@Body() dto: InviteWorkspaceMemberDto): Promise<WorkspaceMemberResponse> {
    const member = await this.inviteWorkspaceMemberUseCase.execute({
      name: dto.name,
      email: dto.email,
      permissions: { ...dto.permissions },
    });

    return WorkspaceMemberResponse.fromDomain(member);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceMemberDto,
    @CurrentMember() actingMember: WorkspaceMember,
  ): Promise<WorkspaceMemberResponse> {
    const member = await this.updateWorkspaceMemberUseCase.execute({
      id,
      actingMemberId: actingMember.getId(),
      name: dto.name,
      permissions: dto.permissions ? { ...dto.permissions } : undefined,
      status: dto.status,
    });

    return WorkspaceMemberResponse.fromDomain(member);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentMember() actingMember: WorkspaceMember): Promise<void> {
    await this.removeWorkspaceMemberUseCase.execute({ id, actingMemberId: actingMember.getId() });
  }
}

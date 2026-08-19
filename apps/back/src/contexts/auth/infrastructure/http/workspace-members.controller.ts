import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { RequiresAdmin } from '../../../../shared/infrastructure/http/access/requires-admin.decorator';
import { InviteWorkspaceMemberUseCase } from '../../application/invite-workspace-member/invite-workspace-member.use-case';
import { ListWorkspaceMembersUseCase } from '../../application/list-workspace-members/list-workspace-members.use-case';
import { RemoveWorkspaceMemberUseCase } from '../../application/remove-workspace-member/remove-workspace-member.use-case';
import { UpdateWorkspaceMemberUseCase } from '../../application/update-workspace-member/update-workspace-member.use-case';
import { WorkspaceMember } from '../../domain/workspace-member';
import { AUTH_USER_DIRECTORY, AuthUserDirectory } from '../../domain/auth-user-directory.port';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository,
} from '../../domain/workspace-member.repository';
import { InviteWorkspaceMemberDto } from './dtos/invite-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dtos/update-workspace-member.dto';
import { WorkspaceMemberResponse } from './workspace-member.response';

const MAX_AVATAR_BYTES = 1024 * 1024;

async function readBoundedResponseBody(response: globalThis.Response): Promise<Buffer | null> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_AVATAR_BYTES) {
    await response.body?.cancel();
    return null;
  }

  if (!response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      totalBytes += result.value.byteLength;
      if (totalBytes > MAX_AVATAR_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(Buffer.from(result.value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

@RequiresAdmin()
@Controller('workspace/members')
export class WorkspaceMembersController {
  constructor(
    private readonly listWorkspaceMembersUseCase: ListWorkspaceMembersUseCase,
    private readonly inviteWorkspaceMemberUseCase: InviteWorkspaceMemberUseCase,
    private readonly updateWorkspaceMemberUseCase: UpdateWorkspaceMemberUseCase,
    private readonly removeWorkspaceMemberUseCase: RemoveWorkspaceMemberUseCase,
    @Inject(AUTH_USER_DIRECTORY) private readonly userDirectory: AuthUserDirectory,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
  ) {}

  @Get()
  async list(): Promise<WorkspaceMemberResponse[]> {
    const members = await this.listWorkspaceMembersUseCase.execute();

    const identities = await this.userDirectory.findByEmails(members.map((member) => member.getEmail()));
    return members.map((member) => WorkspaceMemberResponse.fromDomain(member, identities.get(member.getEmail().toLowerCase())));
  }

  @Get(':id/avatar')
  @Header('Cache-Control', 'private, max-age=86400')
  async avatar(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const member = await this.memberRepository.findById(id);

    if (member === null) {
      throw new NotFoundException('Workspace member not found');
    }

    const identity = (await this.userDirectory.findByEmails([member.getEmail()]))
      .get(member.getEmail().toLowerCase());
    const imageUrl = identity?.image;

    if (!imageUrl) {
      throw new NotFoundException('Workspace member avatar not found');
    }

    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'lh3.googleusercontent.com') {
      throw new NotFoundException('Workspace member avatar not found');
    }

    let imageResponse: globalThis.Response;
    try {
      imageResponse = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    } catch {
      throw new BadGatewayException('Workspace member avatar is unavailable');
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!imageResponse.ok || !contentType?.startsWith('image/')) {
      throw new BadGatewayException('Workspace member avatar is unavailable');
    }

    const image = await readBoundedResponseBody(imageResponse);
    if (image === null) {
      throw new BadGatewayException('Workspace member avatar is unavailable');
    }

    response.setHeader('Content-Type', contentType);
    return new StreamableFile(image);
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

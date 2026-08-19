import { BadGatewayException } from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceMembersController } from './workspace-members.controller';
import { ListWorkspaceMembersUseCase } from '../../application/list-workspace-members/list-workspace-members.use-case';
import { InviteWorkspaceMemberUseCase } from '../../application/invite-workspace-member/invite-workspace-member.use-case';
import { UpdateWorkspaceMemberUseCase } from '../../application/update-workspace-member/update-workspace-member.use-case';
import { RemoveWorkspaceMemberUseCase } from '../../application/remove-workspace-member/remove-workspace-member.use-case';
import { WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { AuthUserDirectory } from '../../domain/auth-user-directory.port';

describe('WorkspaceMembersController avatar', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects an avatar response that exceeds the bounded size while streaming', async () => {
    const memberRepository = {
      findById: jest.fn().mockResolvedValue({ getEmail: () => 'member@example.com' }),
    } as unknown as WorkspaceMemberRepository;
    const userDirectory = {
      findByEmails: jest.fn().mockResolvedValue(
        new Map([['member@example.com', { image: 'https://lh3.googleusercontent.com/avatar' }]]),
      ),
    } as unknown as AuthUserDirectory;
    const controller = new WorkspaceMembersController(
      {} as ListWorkspaceMembersUseCase,
      {} as InviteWorkspaceMemberUseCase,
      {} as UpdateWorkspaceMemberUseCase,
      {} as RemoveWorkspaceMemberUseCase,
      userDirectory,
      memberRepository,
    );
    const response = { setHeader: jest.fn() } as unknown as Response;
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.alloc(1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }),
    );

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
  });

  it('cancels an avatar response before reading a body that is already too large', async () => {
    const memberRepository = {
      findById: jest.fn().mockResolvedValue({ getEmail: () => 'member@example.com' }),
    } as unknown as WorkspaceMemberRepository;
    const userDirectory = {
      findByEmails: jest.fn().mockResolvedValue(
        new Map([['member@example.com', { image: 'https://lh3.googleusercontent.com/avatar' }]]),
      ),
    } as unknown as AuthUserDirectory;
    const controller = new WorkspaceMembersController(
      {} as ListWorkspaceMembersUseCase,
      {} as InviteWorkspaceMemberUseCase,
      {} as UpdateWorkspaceMemberUseCase,
      {} as RemoveWorkspaceMemberUseCase,
      userDirectory,
      memberRepository,
    );
    const response = { setHeader: jest.fn() } as unknown as Response;
    const cancel = jest.fn().mockResolvedValue(undefined);
    const body = new ReadableStream<Uint8Array>({ cancel });
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(body, {
        headers: {
          'content-length': String(1024 * 1024 + 1),
          'content-type': 'image/png',
        },
      }),
    );

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

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
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
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

  it('rejects a redirect outside the Google avatar allowlist', async () => {
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
      new Response(null, { status: 302, headers: { location: 'https://attacker.example/avatar' } }),
    );

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('revalidates every bounded redirect target', async () => {
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
    globalThis.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://lh3.googleusercontent.com/next' } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://attacker.example/avatar' } }));

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects non-raster avatar media types', async () => {
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
      new Response('<svg></svg>', { headers: { 'content-type': 'image/svg+xml' } }),
    );

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
  });

  it('rejects a raster MIME type when the bytes do not match', async () => {
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
      new Response('not a PNG', { headers: { 'content-type': 'image/png' } }),
    );

    await expect(controller.avatar('member-1', response)).rejects.toThrow(BadGatewayException);
  });

  it('serves a bounded PNG only after validating its signature', async () => {
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
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    globalThis.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        headers: { 'content-type': 'image/png; charset=binary' },
      }),
    );

    await expect(controller.avatar('member-1', response)).resolves.toBeDefined();
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
  });
});

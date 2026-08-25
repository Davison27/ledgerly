import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn(() => new Headers()) }));

import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import { MemberEmail } from '../../../../contexts/auth/domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
import {
  AuthSessionResolution,
  ResolvedAuthSession,
} from '../../../domain/auth-session-resolver.port';
import { AccessGuard } from './access.guard';
import { ACCESS_REQUIREMENT_KEY, AccessRequirement } from './access-requirement';
import { IS_PUBLIC_KEY } from './public.decorator';

function permissionMatrix(levels: Partial<Record<(typeof WORKSPACE_MODULES)[number], 'none' | 'view' | 'edit'>>): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = levels[module] ?? 'none';
      return matrix;
    }, {}),
  );
}

function member(permissions: PermissionMatrix, status: 'invited' | 'active' | 'disabled' = 'active'): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('member@ledgerly.dev'),
    name: 'Member',
    permissions,
    status,
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function session(): ResolvedAuthSession {
  return {
    user: { email: 'member@ledgerly.dev' },
    session: {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      token: 'session-token',
    },
  };
}

function resolution(sessionValue: ResolvedAuthSession | null, setCookies: string[] = []): AuthSessionResolution {
  return { session: sessionValue, setCookies };
}

function contextFor(
  request: { headers: Record<string, string>; member?: WorkspaceMember },
  options: { public?: boolean; requirement?: AccessRequirement } = {},
): ExecutionContext {
  const handler = () => undefined;
  const controller = class {};

  if (options.public) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }

  if (options.requirement) {
    Reflect.defineMetadata(ACCESS_REQUIREMENT_KEY, options.requirement, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AccessGuard', () => {
  const memberRepository = {
    findByEmail: jest.fn(),
    save: jest.fn(),
  };
  const sessionResolver = {
    resolve: jest.fn(),
  };
  const clock = {
    now: jest.fn(() => new Date('2026-01-02T00:00:00.000Z')),
    todayIso: jest.fn(() => '2026-01-02'),
  };
  const guard = new AccessGuard(new Reflector(), memberRepository as never, sessionResolver, clock);

  beforeEach(() => {
    memberRepository.findByEmail.mockReset();
    memberRepository.save.mockReset();
    sessionResolver.resolve.mockReset();
    clock.now.mockClear();
  });

  it('allows a public handler without resolving a session', async () => {
    const request: { headers: Record<string, string>; member?: WorkspaceMember } = { headers: {} };

    await expect(guard.canActivate(contextFor(request, { public: true }))).resolves.toBe(true);
    expect(sessionResolver.resolve).not.toHaveBeenCalled();
  });

  it('denies a handler without an explicit access policy', async () => {
    const request: { headers: Record<string, string>; member?: WorkspaceMember } = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessionResolver.resolve).not.toHaveBeenCalled();
  });

  it('returns 401 when the Better Auth session has been revoked', async () => {
    sessionResolver.resolve.mockResolvedValue(resolution(null));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 401 when the shared session resolver fails', async () => {
    sessionResolver.resolve.mockRejectedValue(new Error('session lookup failed'));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 403 when the session user is not a workspace member', async () => {
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 403 when the session member has been disabled', async () => {
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(member(PermissionMatrix.admin(), 'disabled'));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('activates an invited member before granting authenticated access', async () => {
    const invitedMember = member(permissionMatrix({ documents: 'view' }), 'invited');
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(invitedMember);
    memberRepository.save.mockResolvedValue(undefined);
    const request: { headers: Record<string, string>; member?: WorkspaceMember } = { headers: {} };

    await expect(
      guard.canActivate(contextFor(request, { requirement: { kind: 'authenticated' } })),
    ).resolves.toBe(true);

    expect(invitedMember.getStatus()).toBe('active');
    expect(invitedMember.getJoinedAt()).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(memberRepository.save).toHaveBeenCalledWith(invitedMember);
    expect(request.member).toBe(invitedMember);
  });

  it('grants admin-only access to the admin permission matrix', async () => {
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(member(PermissionMatrix.admin()));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'admin' } })),
    ).resolves.toBe(true);
  });

  it('grants editor access to editable document routes', async () => {
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(
      member(permissionMatrix({ dashboard: 'view', staff: 'view', documents: 'edit', projects: 'edit', calendar: 'edit', suppliers: 'edit', equipment: 'edit' })),
    );

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'documents', level: 'edit' } })),
    ).resolves.toBe(true);
  });

  it('grants viewer access to view routes and denies notifications', async () => {
    const viewer = member(permissionMatrix({ dashboard: 'view', projects: 'view', calendar: 'view', documents: 'view', suppliers: 'view', equipment: 'view', staff: 'view' }));
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(viewer);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'documents', level: 'view' } })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'notifications' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('grants custom access only for the modules explicitly permitted', async () => {
    const customMember = member(permissionMatrix({ projects: 'view' }));
    sessionResolver.resolve.mockResolvedValue(resolution(session()));
    memberRepository.findByEmail.mockResolvedValue(customMember);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'projects', level: 'view' } })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'documents', level: 'view' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

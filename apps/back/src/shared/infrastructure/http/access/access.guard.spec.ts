import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn(() => new Headers()) }));
jest.mock('../../../../lib/auth', () => ({ auth: { api: { getSession: jest.fn() } } }));

import { auth } from '../../../../lib/auth';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import { MemberEmail } from '../../../../contexts/auth/domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
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
  const getSession = jest.mocked(auth.api.getSession);
  const memberRepository = {
    findByEmail: jest.fn(),
    save: jest.fn(),
  };
  const clock = {
    now: jest.fn(() => new Date('2026-01-02T00:00:00.000Z')),
    todayIso: jest.fn(() => '2026-01-02'),
  };
  const guard = new AccessGuard(new Reflector(), memberRepository as never, clock);

  beforeEach(() => {
    getSession.mockReset();
    memberRepository.findByEmail.mockReset();
    memberRepository.save.mockReset();
    clock.now.mockClear();
  });

  it('allows a public handler without resolving a session', async () => {
    const request: { headers: Record<string, string>; member?: WorkspaceMember } = { headers: {} };

    await expect(guard.canActivate(contextFor(request, { public: true }))).resolves.toBe(true);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('denies a handler without an explicit access policy', async () => {
    const request: { headers: Record<string, string>; member?: WorkspaceMember } = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('returns 401 when the Better Auth session has been revoked', async () => {
    getSession.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns 403 when the session user is not a workspace member', async () => {
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
    memberRepository.findByEmail.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 403 when the session member has been disabled', async () => {
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
    memberRepository.findByEmail.mockResolvedValue(member(PermissionMatrix.admin(), 'disabled'));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'authenticated' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('activates an invited member before granting authenticated access', async () => {
    const invitedMember = member(permissionMatrix({ documents: 'view' }), 'invited');
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
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
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
    memberRepository.findByEmail.mockResolvedValue(member(PermissionMatrix.admin()));

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'admin' } })),
    ).resolves.toBe(true);
  });

  it('grants editor access to editable document routes', async () => {
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
    memberRepository.findByEmail.mockResolvedValue(
      member(permissionMatrix({ dashboard: 'view', staff: 'view', documents: 'edit', projects: 'edit', calendar: 'edit', suppliers: 'edit', products: 'edit' })),
    );

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'documents', level: 'edit' } })),
    ).resolves.toBe(true);
  });

  it('grants viewer access to view routes and denies notifications', async () => {
    const viewer = member(permissionMatrix({ dashboard: 'view', projects: 'view', calendar: 'view', documents: 'view', suppliers: 'view', products: 'view', staff: 'view' }));
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
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
    getSession.mockResolvedValue({ user: { email: 'member@ledgerly.dev' } } as never);
    memberRepository.findByEmail.mockResolvedValue(customMember);

    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'projects', level: 'view' } })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor({ headers: {} }, { requirement: { kind: 'access', module: 'documents', level: 'view' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

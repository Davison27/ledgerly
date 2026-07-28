import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessGuard } from './access.guard';
import { Authenticated } from './authenticated.decorator';
import { Public } from './public.decorator';
import { RequiresAccess } from './requires-access.decorator';
import { Session } from '../../../../contexts/auth/domain/session';
import { SessionRepository, SessionWithMember } from '../../../../contexts/auth/domain/session.repository';
import { TokenGenerator } from '../../../../contexts/auth/domain/token-generator.port';
import { MemberEmail } from '../../../../contexts/auth/domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import { WorkspaceMemberRepository } from '../../../../contexts/auth/domain/workspace-member.repository';
import { Clock } from '../../../domain/clock.port';

class DummyController {
  @Public()
  publicHandler(): void {}

  @Authenticated()
  authenticatedHandler(): void {}

  @RequiresAccess('documents', 'edit')
  editHandler(): void {}

  undecoratedHandler(): void {}
}

const dummyControllerPrototype = DummyController.prototype;
/* eslint-disable @typescript-eslint/unbound-method */
const PUBLIC_HANDLER = dummyControllerPrototype.publicHandler;
const AUTHENTICATED_HANDLER = dummyControllerPrototype.authenticatedHandler;
const EDIT_HANDLER = dummyControllerPrototype.editHandler;
const UNDECORATED_HANDLER = dummyControllerPrototype.undecoratedHandler;
/* eslint-enable @typescript-eslint/unbound-method */

class FakeSessionRepository implements SessionRepository {
  savedSessions: Session[] = [];

  constructor(private readonly entry: SessionWithMember | null) {}

  findActiveByTokenHash(): Promise<SessionWithMember | null> {
    return Promise.resolve(this.entry);
  }

  save(session: Session): Promise<void> {
    this.savedSessions.push(session);
    return Promise.resolve();
  }

  revokeById(): Promise<void> {
    return Promise.resolve();
  }

  revokeAllForMember(): Promise<void> {
    return Promise.resolve();
  }

  deleteExpired(): Promise<number> {
    return Promise.resolve(0);
  }
}

class FakeWorkspaceMemberRepository implements Pick<WorkspaceMemberRepository, 'touchLastActive'> {
  touchedIds: string[] = [];

  touchLastActive(memberId: string): Promise<void> {
    this.touchedIds.push(memberId);
    return Promise.resolve();
  }
}

class FakeTokenGenerator implements TokenGenerator {
  generateOpaqueToken(): string {
    return 'token';
  }

  hash(value: string): string {
    return `hash(${value})`;
  }

  hashesMatch(hash: string, candidate: string): boolean {
    return hash === candidate;
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

const NOW = new Date('2026-01-10T00:00:00.000Z');

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function viewerMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('viewer@ledgerly.dev'),
    name: 'Viewer',
    permissions: viewerMatrix(),
    status: 'active',
    invitedAt: NOW,
  });
}

function buildContext(
  handler: () => void,
  request: {
    method?: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  },
): ExecutionContext {
  const headers = request.headers ?? {};

  return {
    getHandler: () => handler,
    getClass: () => DummyController,
    switchToHttp: () => ({
      getRequest: () => ({
        method: request.method ?? 'GET',
        cookies: request.cookies ?? {},
        get: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  } as unknown as ExecutionContext;
}

function buildGuard(sessionRepository: FakeSessionRepository): AccessGuard {
  return new AccessGuard(
    new Reflector(),
    sessionRepository,
    new FakeWorkspaceMemberRepository() as unknown as WorkspaceMemberRepository,
    new FakeTokenGenerator(),
    new FixedClock(NOW),
  );
}

describe('AccessGuard', () => {
  it('denies a handler without any access decorator', async () => {
    const guard = buildGuard(new FakeSessionRepository(null));
    const context = buildContext(UNDECORATED_HANDLER, {});

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('lets a public handler through without a session cookie', async () => {
    const guard = buildGuard(new FakeSessionRepository(null));
    const context = buildContext(PUBLIC_HANDLER, {});

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects with 401 when the session is expired', async () => {
    const expiredSession = Session.fromPrimitives({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'hash(csrf)',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      revokedAt: null,
    });
    const guard = buildGuard(
      new FakeSessionRepository({ session: expiredSession, member: viewerMember() }),
    );
    const context = buildContext(AUTHENTICATED_HANDLER, {
      cookies: { lg_session: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a viewer requesting an edit-level module with 403', async () => {
    const session = Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'hash(csrf)',
      now: NOW,
    });
    const guard = buildGuard(new FakeSessionRepository({ session, member: viewerMember() }));
    const context = buildContext(EDIT_HANDLER, {
      cookies: { lg_session: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a POST without X-CSRF-Token with 403', async () => {
    const session = Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'hash(csrf)',
      now: NOW,
    });
    const guard = buildGuard(new FakeSessionRepository({ session, member: viewerMember() }));
    const context = buildContext(AUTHENTICATED_HANDLER, {
      method: 'POST',
      cookies: { lg_session: 'token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('allows a POST with a matching X-CSRF-Token', async () => {
    const session = Session.create({
      id: 'session-1',
      memberId: 'member-1',
      tokenHash: 'hash(token)',
      csrfHash: 'hash(csrf-token)',
      now: NOW,
    });
    const guard = buildGuard(new FakeSessionRepository({ session, member: viewerMember() }));
    const context = buildContext(AUTHENTICATED_HANDLER, {
      method: 'POST',
      cookies: { lg_session: 'token' },
      headers: { 'x-csrf-token': 'csrf-token' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

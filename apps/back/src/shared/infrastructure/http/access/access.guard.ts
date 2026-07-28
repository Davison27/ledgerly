import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CLOCK, Clock } from '../../../domain/clock.port';
import { Session } from '../../../../contexts/auth/domain/session';
import { SESSION_REPOSITORY, SessionRepository } from '../../../../contexts/auth/domain/session.repository';
import { TOKEN_GENERATOR, TokenGenerator } from '../../../../contexts/auth/domain/token-generator.port';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository,
} from '../../../../contexts/auth/domain/workspace-member.repository';
import { AccessRequirement, ACCESS_REQUIREMENT_KEY } from './access-requirement';
import { IS_PUBLIC_KEY } from './public.decorator';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SESSION_COOKIE_NAME = 'lg_session';
const CSRF_HEADER_NAME = 'x-csrf-token';

interface RequestWithMember extends Request {
  member?: WorkspaceMember;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
    @Inject(TOKEN_GENERATOR) private readonly tokenGenerator: TokenGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_REQUIREMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      throw new ForbiddenException();
    }

    const request = context.switchToHttp().getRequest<RequestWithMember>();
    const now = this.clock.now();
    const { session, member } = await this.resolveActiveSession(request, now);

    if (UNSAFE_METHODS.has(request.method)) {
      this.assertCsrf(request, session);
    }

    this.assertRequirement(requirement, member);

    request.member = member;

    await this.touchIfNeeded(session, member, now);

    return true;
  }

  private async resolveActiveSession(
    request: RequestWithMember,
    now: Date,
  ): Promise<{ session: Session; member: WorkspaceMember }> {
    const sessionToken = this.readCookie(request, SESSION_COOKIE_NAME);

    if (sessionToken === null) {
      throw new UnauthorizedException();
    }

    const tokenHash = this.tokenGenerator.hash(sessionToken);
    const found = await this.sessionRepository.findActiveByTokenHash(tokenHash, now);

    if (found === null) {
      throw new UnauthorizedException();
    }

    if (found.session.isExpired(now) || found.session.isIdle(now) || !found.member.isActive()) {
      throw new UnauthorizedException();
    }

    return found;
  }

  private assertCsrf(
    request: Request,
    session: Session,
  ): void {
    const csrfHeader = request.get(CSRF_HEADER_NAME);

    if (!csrfHeader) {
      throw new ForbiddenException();
    }

    const csrfHash = this.tokenGenerator.hash(csrfHeader);

    if (!session.matchesCsrfHash(csrfHash)) {
      throw new ForbiddenException();
    }
  }

  private assertRequirement(requirement: AccessRequirement, member: WorkspaceMember): void {
    if (requirement.kind === 'authenticated') {
      return;
    }

    if (requirement.kind === 'admin') {
      if (!member.isAdmin()) {
        throw new ForbiddenException();
      }

      return;
    }

    if (!member.canAccess(requirement.module, requirement.level)) {
      throw new ForbiddenException();
    }
  }

  private async touchIfNeeded(
    session: Session,
    member: WorkspaceMember,
    now: Date,
  ): Promise<void> {
    if (!session.needsTouch(now)) {
      return;
    }

    session.touch(now);
    await this.sessionRepository.save(session);
    await this.memberRepository.touchLastActive(member.getId(), now);
  }

  private readCookie(request: Request, name: string): string | null {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;

    return cookies?.[name] ?? null;
  }
}

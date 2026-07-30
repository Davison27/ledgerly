import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLOCK, Clock } from '../../../domain/clock.port';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../../../lib/auth';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository,
} from '../../../../contexts/auth/domain/workspace-member.repository';
import { AccessRequirement, ACCESS_REQUIREMENT_KEY } from './access-requirement';
import { IS_PUBLIC_KEY } from './public.decorator';

interface RequestWithMember extends Request {
  member?: WorkspaceMember;
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
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
    const member = await this.resolveActiveMember(request);

    this.assertRequirement(requirement, member);

    request.member = member;

    return true;
  }

  private async resolveActiveMember(
    request: RequestWithMember,
  ): Promise<WorkspaceMember> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

    if (session === null) {
      throw new UnauthorizedException();
    }

    const member = await this.memberRepository.findByEmail(session.user.email);

    if (member === null || member.isDisabled()) {
      throw new ForbiddenException();
    }

    if (!member.isActive()) {

      member.activate(this.clock.now());
      await this.memberRepository.save(member);
    }

    return member;
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

}

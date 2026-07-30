import { All, Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { auth } from '../../../../lib/auth';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { Public } from '../../../../shared/infrastructure/http/access/public.decorator';
import { BootstrapFirstAdminUseCase } from '../../application/bootstrap-first-admin/bootstrap-first-admin.use-case';
import { GetCurrentMemberUseCase } from '../../application/get-current-member/get-current-member.use-case';
import { WORKSPACE_MEMBER_REPOSITORY, WorkspaceMemberRepository } from '../../domain/workspace-member.repository';
import { WorkspaceMember } from '../../domain/workspace-member';
import { BootstrapFirstAdminResponse } from './bootstrap-first-admin.response';
import { BootstrapFirstAdminDto } from './dtos/bootstrap-first-admin.dto';
import { WorkspaceMemberResponse } from './workspace-member.response';
import { Inject } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly bootstrapFirstAdminUseCase: BootstrapFirstAdminUseCase,
    private readonly getCurrentMemberUseCase: GetCurrentMemberUseCase,
    @Inject(WORKSPACE_MEMBER_REPOSITORY) private readonly memberRepository: WorkspaceMemberRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status(@Req() req: Request): Promise<{ bootstrapNeeded: boolean; authenticated: boolean }> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const member = session ? await this.memberRepository.findByEmail(session.user.email) : null;

    if (member?.getStatus() === 'invited') {
      member.activate(this.clock.now());
      await this.memberRepository.save(member);
    }

    return {
      bootstrapNeeded: (await this.memberRepository.countAll()) === 0,
      authenticated: member?.isActive() ?? false,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  async bootstrap(@Body() dto: BootstrapFirstAdminDto): Promise<BootstrapFirstAdminResponse> {
    const member = await this.bootstrapFirstAdminUseCase.execute({ email: dto.email });

    return BootstrapFirstAdminResponse.fromDomain(member);
  }

  @Authenticated()
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@CurrentMember() member: WorkspaceMember): Promise<WorkspaceMemberResponse> {
    const current = await this.getCurrentMemberUseCase.execute(member.getId());

    return WorkspaceMemberResponse.fromDomain(current);
  }

  @Public()
  @All('*')
  async handler(@Req() req: Request, @Res() res: { status: (status: number) => void; setHeader: (name: string, value: string) => void; send: (body: string) => void }): Promise<void> {
    const headers = new Headers();

    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
    }

    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const response = await auth.handler(request);

    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.status(response.status);
    res.send(await response.text());
  }
}

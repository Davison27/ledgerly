import { All, Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response as ExpressResponse } from 'express';
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

const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3005';
const GENERIC_AUTH_ERROR = 'Authentication request failed';
const UNTRUSTED_REQUEST_HEADERS = new Set([
  'connection',
  'content-length',
  'expect',
  'forwarded',
  'host',
  'transfer-encoding',
  'upgrade',
  'via',
  'x-client-ip',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
]);
const RESPONSE_HEADERS_TO_SKIP = new Set(['connection', 'content-length', 'transfer-encoding']);

function authHeadersFromRequest(req: Request): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || UNTRUSTED_REQUEST_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  if (req.ip) headers.set('x-forwarded-for', req.ip);

  return headers;
}

function authRequestUrl(req: Request): string {
  const baseUrl = new URL(BACKEND_PUBLIC_URL);
  const pathAndQuery = req.originalUrl.startsWith('/') && !req.originalUrl.startsWith('//') ? req.originalUrl : '/';

  return new URL(pathAndQuery, baseUrl).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeFormValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function serializeAuthRequestBody(body: unknown, contentType: string | null): BodyInit | undefined {
  if (body === undefined) return undefined;
  const mediaType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType === 'application/json') return JSON.stringify(body);
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (typeof body === 'string') return body;

  if (mediaType === 'application/x-www-form-urlencoded' && isRecord(body)) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          const serialized = serializeFormValue(item);
          if (serialized !== null) params.append(key, serialized);
        }
      } else if (value !== undefined && value !== null) {
        const serialized = serializeFormValue(value);
        if (serialized !== null) params.append(key, serialized);
      }
    }

    return params.toString();
  }

  return JSON.stringify(body);
}

function genericAuthErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as unknown;
    const code = isRecord(parsed) && typeof parsed.code === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(parsed.code)
      ? parsed.code
      : undefined;

    return JSON.stringify(code ? { code, message: GENERIC_AUTH_ERROR } : { message: GENERIC_AUTH_ERROR });
  } catch {
    return JSON.stringify({ message: GENERIC_AUTH_ERROR });
  }
}

function forwardAuthResponseHeaders(response: globalThis.Response, res: ExpressResponse): void {
  const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = responseHeaders.getSetCookie?.() ?? [];

  response.headers.forEach((value, name) => {
    const normalizedName = name.toLowerCase();
    if (normalizedName === 'set-cookie' || RESPONSE_HEADERS_TO_SKIP.has(normalizedName)) return;
    res.setHeader(name, value);
  });

  if (setCookies.length > 0) {
    res.setHeader('set-cookie', setCookies);
  }
}

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
    const session = await auth.api.getSession({ headers: authHeadersFromRequest(req) });
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
  async handler(@Req() req: Request, @Res() res: ExpressResponse): Promise<void> {
    const headers = authHeadersFromRequest(req);
    const request = new Request(authRequestUrl(req), {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : serializeAuthRequestBody(req.body, headers.get('content-type')),
    });

    let response: globalThis.Response;
    try {
      response = await auth.handler(request);
    } catch {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ message: GENERIC_AUTH_ERROR }));
      return;
    }

    forwardAuthResponseHeaders(response, res);
    res.status(response.status);
    const body = await response.text();
    res.send(response.status >= 400 ? genericAuthErrorBody(body) : body);
  }
}

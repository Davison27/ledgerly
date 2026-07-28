import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { Public } from '../../../../shared/infrastructure/http/access/public.decorator';
import { BootstrapFirstAdminUseCase } from '../../application/bootstrap-first-admin/bootstrap-first-admin.use-case';
import { CompleteGoogleLoginUseCase } from '../../application/complete-google-login/complete-google-login.use-case';
import { GetAuthStatusUseCase } from '../../application/get-auth-status/get-auth-status.use-case';
import { GetCurrentMemberUseCase } from '../../application/get-current-member/get-current-member.use-case';
import { LogoutUseCase } from '../../application/logout/logout.use-case';
import { StartGoogleLoginUseCase } from '../../application/start-google-login/start-google-login.use-case';
import { GoogleIdentityRejectedException } from '../../domain/errors/google-identity-rejected.exception';
import { OAuthAttemptExpiredException } from '../../domain/errors/oauth-attempt-expired.exception';
import { WorkspaceMember } from '../../domain/workspace-member';
import {
  clearOAuthCookie,
  clearSessionCookies,
  OAUTH_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  setOAuthCookie,
  setSessionCookies,
} from './auth-cookies';
import { AuthStatusResponse } from './auth-status.response';
import { BootstrapFirstAdminResponse } from './bootstrap-first-admin.response';
import { BootstrapFirstAdminDto } from './dtos/bootstrap-first-admin.dto';
import { StartGoogleLoginDto } from './dtos/start-google-login.dto';
import { StartGoogleLoginResponse } from './start-google-login.response';
import { WorkspaceMemberResponse } from './workspace-member.response';

type AuthErrorCode = 'access_denied' | 'expired' | 'failed';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly getAuthStatusUseCase: GetAuthStatusUseCase,
    private readonly bootstrapFirstAdminUseCase: BootstrapFirstAdminUseCase,
    private readonly startGoogleLoginUseCase: StartGoogleLoginUseCase,
    private readonly completeGoogleLoginUseCase: CompleteGoogleLoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentMemberUseCase: GetCurrentMemberUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status(@Req() req: Request): Promise<AuthStatusResponse> {
    const sessionToken = this.readCookie(req, SESSION_COOKIE_NAME);
    const result = await this.getAuthStatusUseCase.execute({ sessionToken });

    return AuthStatusResponse.fromResult(result);
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

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google/start')
  @Header('Cache-Control', 'no-store')
  async startGoogleLogin(
    @Body() dto: StartGoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StartGoogleLoginResponse> {
    const result = await this.startGoogleLoginUseCase.execute({
      redirectTo: dto.redirectTo,
      loginHint: dto.loginHint,
    });

    setOAuthCookie(res, this.isCookieSecure(), result.transactionToken);

    return StartGoogleLoginResponse.fromUrl(result.authorizationUrl);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('google/callback')
  @Header('Cache-Control', 'no-store')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const secure = this.isCookieSecure();
    const transactionToken = this.readCookie(req, OAUTH_COOKIE_NAME);
    const existingSessionToken = this.readCookie(req, SESSION_COOKIE_NAME);

    if (!code || !state || !transactionToken) {
      clearOAuthCookie(res, secure);
      res.redirect(HttpStatus.FOUND, `${frontendUrl}/?authError=failed`);
      return;
    }

    try {
      const result = await this.completeGoogleLoginUseCase.execute({
        transactionToken,
        code,
        state,
        existingSessionToken,
      });

      clearOAuthCookie(res, secure);
      setSessionCookies(res, secure, result.sessionToken, result.csrfToken);
      res.redirect(HttpStatus.FOUND, `${frontendUrl}${result.redirectTo}`);
    } catch (error) {
      clearOAuthCookie(res, secure);
      res.redirect(HttpStatus.FOUND, `${frontendUrl}/?authError=${this.resolveAuthErrorCode(error)}`);
    }
  }

  @Authenticated()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const sessionToken = this.readCookie(req, SESSION_COOKIE_NAME);

    if (sessionToken !== null) {
      await this.logoutUseCase.execute({ sessionToken });
    }

    clearSessionCookies(res, this.isCookieSecure());
    clearOAuthCookie(res, this.isCookieSecure());
  }

  @Authenticated()
  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@CurrentMember() member: WorkspaceMember): Promise<WorkspaceMemberResponse> {
    const current = await this.getCurrentMemberUseCase.execute(member.getId());

    return WorkspaceMemberResponse.fromDomain(current);
  }

  private isCookieSecure(): boolean {
    return this.configService.get<boolean>('COOKIE_SECURE', false);
  }

  private readCookie(req: Request, name: string): string | null {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;

    return cookies?.[name] ?? null;
  }

  private resolveAuthErrorCode(error: unknown): AuthErrorCode {
    if (error instanceof OAuthAttemptExpiredException) {
      return 'expired';
    }

    if (error instanceof GoogleIdentityRejectedException) {
      return 'access_denied';
    }

    return 'failed';
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!UNSAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const origin = request.get('origin');
    const referer = request.get('referer');
    const allowed = origin !== undefined
      ? this.matchesFrontendOrigin(origin, true)
      : referer !== undefined && this.matchesFrontendOrigin(referer, false);

    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }

  private matchesFrontendOrigin(value: string, originHeader: boolean): boolean {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    try {
      const parsed = new URL(value);
      const frontend = new URL(frontendUrl);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        !['http:', 'https:'].includes(frontend.protocol) ||
        parsed.username ||
        parsed.password ||
        frontend.username ||
        frontend.password
      ) {
        return false;
      }

      if (originHeader && (parsed.pathname !== '/' || parsed.search || parsed.hash)) {
        return false;
      }

      return parsed.origin === frontend.origin;
    } catch {
      return false;
    }
  }
}

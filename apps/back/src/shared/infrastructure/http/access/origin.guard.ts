import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!UNSAFE_METHODS.has(request.method)) {
      return true;
    }

    const origin = request.get('origin') ?? request.get('referer');

    if (!origin || !this.matchesFrontendOrigin(origin)) {
      throw new ForbiddenException();
    }

    return true;
  }

  private matchesFrontendOrigin(origin: string): boolean {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    try {
      return new URL(origin).origin === new URL(frontendUrl).origin;
    } catch {
      return false;
    }
  }
}

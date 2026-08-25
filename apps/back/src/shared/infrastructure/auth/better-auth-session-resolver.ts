import { Inject, Injectable } from '@nestjs/common';
import { auth } from '../../../lib/auth';
import {
  AuthSessionResolution,
  AuthSessionResolver,
  ResolvedAuthSession,
} from '../../domain/auth-session-resolver.port';
import { CLOCK, Clock } from '../../domain/clock.port';

export const ABSOLUTE_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function isOverAbsoluteAge(session: ResolvedAuthSession, now: Date): boolean {
  const nowTime = now.getTime();
  const createdAtTime = new Date(session.session.createdAt).getTime();

  return !Number.isFinite(nowTime)
    || !Number.isFinite(createdAtTime)
    || createdAtTime > nowTime
    || nowTime - createdAtTime >= ABSOLUTE_SESSION_MAX_AGE_MS;
}

function getSetCookieValues(headers: Headers | undefined): string[] {
  if (headers?.getSetCookie) {
    return headers.getSetCookie();
  }

  const setCookie = headers?.get('set-cookie');

  return setCookie ? [setCookie] : [];
}

@Injectable()
export class BetterAuthSessionResolver implements AuthSessionResolver {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async resolve(headers: Headers): Promise<AuthSessionResolution> {
    try {
      const sessionResult = await auth.api.getSession({ headers, returnHeaders: true });
      const setCookies = getSetCookieValues(sessionResult.headers);
      const session = sessionResult.response;

      if (session === null) {
        return { session: null, setCookies };
      }

      if (!isOverAbsoluteAge(session, this.clock.now())) {
        return { session, setCookies };
      }

      const signOutResult = await auth.api.signOut({
        headers,
        returnHeaders: true,
      });

      if (!signOutResult.response.success) {
        return { session: null, setCookies: [] };
      }

      return {
        session: null,
        setCookies: getSetCookieValues(signOutResult.headers),
      };
    } catch {
      return { session: null, setCookies: [] };
    }
  }
}

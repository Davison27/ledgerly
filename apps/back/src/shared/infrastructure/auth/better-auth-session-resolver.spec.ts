import { Clock } from '../../domain/clock.port';
import { ResolvedAuthSession } from '../../domain/auth-session-resolver.port';

jest.mock('../../../lib/auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { auth } from '../../../lib/auth';
import { BetterAuthSessionResolver } from './better-auth-session-resolver';

function session(createdAt: string, token = 'session-token'): ResolvedAuthSession {
  return {
    user: { email: 'member@ledgerly.dev' },
    session: {
      createdAt: new Date(createdAt),
      token,
    },
  };
}

function headersWithCookies(setCookies: string[]): Headers {
  const headers = new Headers();

  Object.defineProperty(headers, 'getSetCookie', { value: () => setCookies });

  return headers;
}

function authResponse<T>(response: T, setCookies: string[] = []): {
  headers: Headers;
  response: T;
} {
  return { headers: headersWithCookies(setCookies), response };
}

describe('BetterAuthSessionResolver', () => {
  const getSession = jest.mocked(auth.api.getSession);
  const signOut = jest.mocked(auth.api.signOut);
  const clock: Clock = {
    now: () => new Date('2026-01-01T08:00:00.000Z'),
    todayIso: () => '2026-01-01',
  };
  const resolver = new BetterAuthSessionResolver(clock);
  const headers = new Headers({ cookie: 'ledgerly.session=session-token' });

  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset();
  });

  it('returns a session within the absolute age limit', async () => {
    const currentSession = session('2026-01-01T00:00:01.000Z');
    const refreshCookie = 'ledgerly.session=refreshed; Path=/';
    getSession.mockResolvedValue(authResponse(currentSession, [refreshCookie]) as never);

    await expect(resolver.resolve(headers)).resolves.toEqual({
      session: currentSession,
      setCookies: [refreshCookie],
    });
    expect(getSession).toHaveBeenCalledWith({ headers, returnHeaders: true });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('returns no session when Better Auth has no current session', async () => {
    const deletionCookie = 'ledgerly.session=; Max-Age=0; Path=/';
    getSession.mockResolvedValue(authResponse(null, [deletionCookie]) as never);

    await expect(resolver.resolve(headers)).resolves.toEqual({
      session: null,
      setCookies: [deletionCookie],
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('signs out and rejects a session at the absolute age limit', async () => {
    const currentSession = session('2026-01-01T00:00:00.000Z');
    const refreshCookie = 'ledgerly.session=refreshed; Path=/';
    const deletionCookie = 'ledgerly.session=; Max-Age=0; Path=/';
    getSession.mockResolvedValue(authResponse(currentSession, [refreshCookie]) as never);
    signOut.mockResolvedValue(authResponse({ success: true }, [deletionCookie]) as never);

    await expect(resolver.resolve(headers)).resolves.toEqual({
      session: null,
      setCookies: [deletionCookie],
    });
    expect(signOut).toHaveBeenCalledWith({
      headers,
      returnHeaders: true,
    });
  });

  it('signs out and rejects a session created in the future', async () => {
    const currentSession = session('2026-01-01T08:00:00.001Z');
    const deletionCookie = 'ledgerly.session=; Max-Age=0; Path=/';
    getSession.mockResolvedValue(authResponse(currentSession) as never);
    signOut.mockResolvedValue(authResponse({ success: true }, [deletionCookie]) as never);

    await expect(resolver.resolve(headers)).resolves.toEqual({
      session: null,
      setCookies: [deletionCookie],
    });
    expect(signOut).toHaveBeenCalledWith({
      headers,
      returnHeaders: true,
    });
  });

  it('fails closed when session resolution fails', async () => {
    getSession.mockRejectedValue(new Error('database unavailable'));

    await expect(resolver.resolve(headers)).resolves.toEqual({ session: null, setCookies: [] });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('fails closed when over-age session sign-out fails', async () => {
    getSession.mockResolvedValue(authResponse(session('2026-01-01T00:00:00.000Z')) as never);
    signOut.mockRejectedValue(new Error('database unavailable'));

    await expect(resolver.resolve(headers)).resolves.toEqual({ session: null, setCookies: [] });
  });
});

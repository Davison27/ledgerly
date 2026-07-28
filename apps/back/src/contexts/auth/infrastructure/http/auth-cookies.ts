import { CookieOptions, Response } from 'express';

export const SESSION_COOKIE_NAME = 'lg_session';
export const CSRF_COOKIE_NAME = 'lg_csrf';
export const OAUTH_COOKIE_NAME = 'lg_oauth';

const SESSION_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function baseCookieOptions(secure: boolean): CookieOptions {
  return { secure, sameSite: 'lax' };
}

export function setSessionCookies(
  res: Response,
  secure: boolean,
  sessionToken: string,
  csrfToken: string,
): void {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    ...baseCookieOptions(secure),
    httpOnly: true,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...baseCookieOptions(secure),
    httpOnly: false,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE_NAME, { ...baseCookieOptions(secure), httpOnly: true, path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { ...baseCookieOptions(secure), httpOnly: false, path: '/' });
}

export function setOAuthCookie(res: Response, secure: boolean, transactionToken: string): void {
  res.cookie(OAUTH_COOKIE_NAME, transactionToken, {
    ...baseCookieOptions(secure),
    httpOnly: true,
    path: '/api/auth',
    maxAge: OAUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearOAuthCookie(res: Response, secure: boolean): void {
  res.clearCookie(OAUTH_COOKIE_NAME, { ...baseCookieOptions(secure), httpOnly: true, path: '/api/auth' });
}

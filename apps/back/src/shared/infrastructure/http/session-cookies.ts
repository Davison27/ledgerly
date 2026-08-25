import type { Response } from 'express';

export function appendSetCookies(response: Response | undefined, setCookies: string[]): void {
  if (!response || setCookies.length === 0) {
    return;
  }

  const existing = response.getHeader('set-cookie');
  const existingSetCookies = existing === undefined
    ? []
    : Array.isArray(existing)
      ? existing.map((value) => String(value))
      : [String(existing)];

  response.setHeader('set-cookie', [...existingSetCookies, ...setCookies]);
}

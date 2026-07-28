import { timingSafeEqual } from 'node:crypto';

export function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

import { PROJECT_COLOR_TOKENS, PROJECT_PALETTE, type ProjectColorToken } from '@/shared/config/theme';

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isProjectColorToken(value: string): value is ProjectColorToken {
  return (PROJECT_COLOR_TOKENS as readonly string[]).includes(value);
}

export function deriveColorToken(seed: string): ProjectColorToken {
  return PROJECT_COLOR_TOKENS[hashSeed(seed) % PROJECT_COLOR_TOKENS.length];
}

export function resolveProjectColor(token: string | null, seed: string, isDark: boolean): string {
  const resolvedToken = token && isProjectColorToken(token) ? token : deriveColorToken(seed);
  return PROJECT_PALETTE[resolvedToken][isDark ? 'dark' : 'light'];
}

export function seedColor(seed: string, isDark: boolean): string {
  const token = deriveColorToken(seed);
  return PROJECT_PALETTE[token][isDark ? 'dark' : 'light'];
}

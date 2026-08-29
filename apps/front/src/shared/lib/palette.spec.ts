import { describe, expect, it } from 'vitest';
import { PROJECT_COLOR_TOKENS, PROJECT_PALETTE } from '@/shared/config/theme';
import { deriveColorToken, resolveProjectColor, seedColor } from './palette';

describe('project palette helpers', () => {
  it('derives a stable token from the same seed', () => {
    expect(deriveColorToken('project-42')).toBe(deriveColorToken('project-42'));
    expect(PROJECT_COLOR_TOKENS).toContain(deriveColorToken('project-42'));
  });

  it('uses an explicit valid token instead of the fallback seed', () => {
    expect(resolveProjectColor('teal', 'any-seed', false)).toBe(PROJECT_PALETTE.teal.light);
    expect(resolveProjectColor('teal', 'any-seed', true)).toBe(PROJECT_PALETTE.teal.dark);
  });

  it('falls back to a deterministic seed color for invalid or missing tokens', () => {
    expect(resolveProjectColor('unknown', 'project-42', false)).toBe(
      seedColor('project-42', false),
    );
    expect(resolveProjectColor(null, 'project-42', true)).toBe(seedColor('project-42', true));
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatDateRange, formatRelativeTime, parseIsoDate } from './dates';

describe('date helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses an ISO date without shifting its calendar day', () => {
    const value = parseIsoDate('2026-08-29');

    expect(value.getFullYear()).toBe(2026);
    expect(value.getMonth()).toBe(7);
    expect(value.getDate()).toBe(29);
  });

  it('formats single dates and ranges according to the requested locale', () => {
    expect(formatDate('2026-08-29', 'es-ES')).toContain('29');
    expect(formatDateRange('2026-08-29', '2026-08-29', 'es-ES')).toBe(
      formatDate('2026-08-29', 'es-ES'),
    );
    expect(formatDateRange('2026-08-29', '2026-08-31', 'es-ES')).toContain('ago');
  });

  it('selects relative time units from minutes through weeks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));

    expect(formatRelativeTime(new Date('2026-08-29T11:45:00.000Z'), 'en-US')).toBe(
      '15 minutes ago',
    );
    expect(formatRelativeTime(new Date('2026-08-29T10:00:00.000Z'), 'en-US')).toBe('2 hours ago');
    expect(formatRelativeTime(new Date('2026-08-27T12:00:00.000Z'), 'en-US')).toBe('2 days ago');
    expect(formatRelativeTime(new Date('2026-08-15T12:00:00.000Z'), 'en-US')).toBe('2 weeks ago');
  });
});

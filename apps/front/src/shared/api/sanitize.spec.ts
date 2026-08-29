import { describe, expect, it } from 'vitest';
import { stripEmpty } from './sanitize';

describe('stripEmpty', () => {
  it('removes undefined, null, and whitespace-only string values', () => {
    expect(
      stripEmpty({
        name: 'Project',
        notes: '   ',
        amount: 0,
        enabled: false,
        empty: null,
        missing: undefined,
      }),
    ).toEqual({ name: 'Project', amount: 0, enabled: false });
  });

  it('preserves null values when requested', () => {
    expect(stripEmpty({ notes: null, name: '' }, { preserveNull: true })).toEqual({ notes: null });
  });

  it('does not mutate the input object', () => {
    const input = { name: 'Project', notes: null as string | null };

    stripEmpty(input);

    expect(input).toEqual({ name: 'Project', notes: null });
  });
});

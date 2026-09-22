import { describe, expect, it } from 'vitest';
import { shouldClearProjectFilter } from './documentsPage';

describe('documents page filters', () => {
  it('clears a project that is not in the selected client scope', () => {
    expect(
      shouldClearProjectFilter(
        'client-1',
        'project-2',
        [{ id: 'project-1' } as never],
        false,
        false,
      ),
    ).toBe(true);
  });

  it('keeps a project while the scoped list is loading or unavailable', () => {
    const project = { id: 'project-2' } as never;

    expect(shouldClearProjectFilter('client-1', 'project-2', [project], true, false)).toBe(false);
    expect(shouldClearProjectFilter('client-1', 'project-2', [], false, true)).toBe(false);
  });

  it('does not clear a project without an active client filter', () => {
    expect(shouldClearProjectFilter(undefined, 'project-2', [], false, false)).toBe(false);
  });
});

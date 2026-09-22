import { describe, expect, it } from 'vitest';
import { projectClientProjectsPath } from './projectHierarchy';

describe('project hierarchy navigation', () => {
  it('returns the scoped company project route for a persisted parent', () => {
    expect(projectClientProjectsPath({ client: { id: 'client/1' } as never })).toBe(
      '/companies/client%2F1/projects',
    );
  });

  it('returns no hierarchy route when the legacy parent is unavailable', () => {
    expect(projectClientProjectsPath({ client: null })).toBeNull();
  });
});

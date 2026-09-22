import { describe, expect, it } from 'vitest';
import { projectQueries } from './project.queries';

describe('project query factories', () => {
  it('keeps global and client-scoped list keys distinct', () => {
    expect(projectQueries.list().queryKey).toEqual(['projects', 'list', null]);
    expect(projectQueries.list('client-1').queryKey).toEqual(['projects', 'list', 'client-1']);
  });

  it('keeps project details below the shared project root', () => {
    expect(projectQueries.detail('project-1').queryKey).toEqual([
      'projects',
      'detail',
      'project-1',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { documentQueries } from './document.queries';

describe('document query factories', () => {
  it('keeps client and project filters in the list key', () => {
    expect(
      documentQueries.listPage({ clientId: 'client-1', projectId: 'project-1' }, 2, 20).queryKey,
    ).toEqual([
      'documents',
      'list-page',
      { clientId: 'client-1', projectId: 'project-1' },
      2,
      20,
    ]);
  });

  it('keeps client-scoped and project-only document keys distinct', () => {
    expect(documentQueries.list({ projectId: 'project-1' }).queryKey).not.toEqual(
      documentQueries.list({ clientId: 'client-1', projectId: 'project-1' }).queryKey,
    );
  });
});

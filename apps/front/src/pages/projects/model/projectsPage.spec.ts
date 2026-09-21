import { describe, expect, it } from 'vitest';
import { projectDeletionMessageKey, visibleProjects } from './projectsPage';

describe('projects page model', () => {
  it('hides archived projects by default and maps archive outcomes', () => {
    const projects = [
      { id: 'active', name: 'Active', code: 'A', documentCount: 0, pendingCount: 0, status: 'active' as const },
      { id: 'archived', name: 'Archived', code: 'B', documentCount: 0, pendingCount: 0, status: 'archived' as const },
    ];

    expect(visibleProjects(projects, false).map((project) => project.id)).toEqual(['active']);
    expect(projectDeletionMessageKey('archived')).toBe('projects.archived');
  });
});

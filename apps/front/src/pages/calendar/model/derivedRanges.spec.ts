import { describe, expect, it } from 'vitest';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import { deriveProjectRange, deriveProjectRanges } from './derivedRanges';

function project(overrides: Partial<SchedulableProjectDto> = {}): SchedulableProjectDto {
  return {
    id: 'project-1',
    name: 'Project',
    code: 'PRJ-1',
    image: null,
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    color: null,
    hasEvents: false,
    ...overrides,
  };
}

describe('derived calendar ranges', () => {
  it('derives a range only for active projects without events', () => {
    expect(deriveProjectRange(project())).toEqual({
      projectId: 'project-1',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
    });
    expect(deriveProjectRange(project({ status: 'completed' }))).toBeNull();
    expect(deriveProjectRange(project({ hasEvents: true }))).toBeNull();
  });

  it('uses the known boundary when only one date exists', () => {
    expect(deriveProjectRange(project({ endDate: null }))).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-01',
    });
    expect(deriveProjectRange(project({ startDate: null }))).toMatchObject({
      startDate: '2026-03-05',
      endDate: '2026-03-05',
    });
  });

  it('returns no range when both boundaries are absent', () => {
    expect(deriveProjectRange(project({ startDate: null, endDate: null }))).toBeNull();
  });

  it('filters projects without derivable ranges', () => {
    expect(deriveProjectRanges([project(), project({ id: 'project-2', hasEvents: true })])).toEqual(
      [
        {
          projectId: 'project-1',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
        },
      ],
    );
  });
});

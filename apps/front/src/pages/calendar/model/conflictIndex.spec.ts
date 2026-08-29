import { describe, expect, it } from 'vitest';
import type { ScheduleBoardDto, ScheduleConflictDto } from '@/entities/schedule-event';
import {
  buildConflictIndex,
  conflictsForEvent,
  conflictsForEventInRange,
  hasErrorConflict,
  hasInfoConflict,
  staffAssignmentConflicts,
} from './conflictIndex';

function conflict(overrides: Partial<ScheduleConflictDto> = {}): ScheduleConflictDto {
  return {
    kind: 'staff_overlap',
    severity: 'error',
    eventId: 'event-1',
    date: '2026-03-03',
    staffMemberId: 'staff-1',
    equipmentId: null,
    relatedEventId: 'event-2',
    stock: null,
    allocated: null,
    ...overrides,
  };
}

describe('calendar conflict index', () => {
  it('indexes conflicts by event and date', () => {
    const second = conflict({ date: '2026-03-04' });
    const index = buildConflictIndex([conflict(), second]);

    expect(conflictsForEvent(index, 'event-1')).toEqual([conflict(), second]);
    expect(index.byDate.get('2026-03-03')).toEqual([conflict()]);
  });

  it('filters event conflicts by inclusive date range and retains date-less conflicts', () => {
    const index = buildConflictIndex([
      conflict({ date: null }),
      conflict({ date: '2026-03-02' }),
      conflict({ date: '2026-03-03' }),
      conflict({ date: '2026-03-05' }),
    ]);

    expect(conflictsForEventInRange(index, 'event-1', '2026-03-03', '2026-03-04')).toHaveLength(2);
  });

  it('returns only staff assignment conflict kinds for the requested staff member', () => {
    const board: ScheduleBoardDto = {
      events: [],
      conflicts: [
        conflict(),
        conflict({ kind: 'outside_project_dates' }),
        conflict({ eventId: 'event-2' }),
        conflict({ staffMemberId: 'staff-2' }),
      ],
      summary: { errorCount: 0, infoCount: 0, byKind: {} as ScheduleBoardDto['summary']['byKind'] },
    };

    expect(staffAssignmentConflicts(board, 'event-1', 'staff-1')).toEqual([conflict()]);
    expect(staffAssignmentConflicts(null, 'event-1', 'staff-1')).toEqual([]);
  });

  it('detects error and info severities independently', () => {
    expect(hasErrorConflict([conflict({ severity: 'error' })])).toBe(true);
    expect(hasInfoConflict([conflict({ severity: 'info' })])).toBe(true);
    expect(hasErrorConflict([conflict({ severity: 'info' })])).toBe(false);
  });
});

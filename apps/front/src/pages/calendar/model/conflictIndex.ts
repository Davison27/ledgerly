import type { ScheduleBoardDto, ScheduleConflictDto } from '@/entities/schedule-event';

export interface ConflictIndex {
  byEvent: Map<string, ScheduleConflictDto[]>;
  byDate: Map<string, ScheduleConflictDto[]>;
}

export function buildConflictIndex(conflicts: ScheduleConflictDto[]): ConflictIndex {
  const byEvent = new Map<string, ScheduleConflictDto[]>();
  const byDate = new Map<string, ScheduleConflictDto[]>();

  for (const conflict of conflicts) {
    byEvent.set(conflict.eventId, [...(byEvent.get(conflict.eventId) ?? []), conflict]);
    if (conflict.date) {
      byDate.set(conflict.date, [...(byDate.get(conflict.date) ?? []), conflict]);
    }
  }

  return { byEvent, byDate };
}

export function conflictsForEvent(
  index: ConflictIndex,
  eventId: string,
): ScheduleConflictDto[] {
  return index.byEvent.get(eventId) ?? [];
}

export function conflictsForEventInRange(
  index: ConflictIndex,
  eventId: string,
  fromDate: string,
  toDate: string,
): ScheduleConflictDto[] {
  return conflictsForEvent(index, eventId).filter(
    (conflict) => conflict.date === null || (conflict.date >= fromDate && conflict.date <= toDate),
  );
}

const STAFF_ASSIGNMENT_CONFLICT_KINDS = ['staff_not_hired', 'staff_overlap'] as const;

export function staffAssignmentConflicts(
  board: ScheduleBoardDto | null,
  eventId: string,
  staffMemberId: string,
): ScheduleConflictDto[] {
  if (!board) return [];
  return board.conflicts.filter(
    (conflict) =>
      conflict.eventId === eventId &&
      conflict.staffMemberId === staffMemberId &&
      (STAFF_ASSIGNMENT_CONFLICT_KINDS as readonly string[]).includes(conflict.kind),
  );
}

export function hasErrorConflict(conflicts: ScheduleConflictDto[]): boolean {
  return conflicts.some((conflict) => conflict.severity === 'error');
}

export function hasInfoConflict(conflicts: ScheduleConflictDto[]): boolean {
  return conflicts.some((conflict) => conflict.severity === 'info');
}

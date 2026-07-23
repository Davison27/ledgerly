import type { ScheduleConflictDto } from '@/entities/schedule-event';

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

export function conflictsForEventOnDate(
  index: ConflictIndex,
  eventId: string,
  date: string,
): ScheduleConflictDto[] {
  return conflictsForEvent(index, eventId).filter(
    (conflict) => conflict.date === null || conflict.date === date,
  );
}

export function hasErrorConflict(conflicts: ScheduleConflictDto[]): boolean {
  return conflicts.some((conflict) => conflict.severity === 'error');
}

export function hasInfoConflict(conflicts: ScheduleConflictDto[]): boolean {
  return conflicts.some((conflict) => conflict.severity === 'info');
}

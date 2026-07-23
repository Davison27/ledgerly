import { SCHEDULE_CONFLICT_KINDS, ScheduleConflict, ScheduleConflictKind } from '../../domain/schedule-conflict';

export interface ScheduleBoardSummary {
  errorCount: number;
  infoCount: number;
  byKind: Record<ScheduleConflictKind, number>;
}

export function summarizeScheduleConflicts(conflicts: ScheduleConflict[]): ScheduleBoardSummary {
  const byKind = SCHEDULE_CONFLICT_KINDS.reduce(
    (accumulator, kind) => ({ ...accumulator, [kind]: 0 }),
    {} as Record<ScheduleConflictKind, number>,
  );

  const seenStaffOverlaps = new Set<string>();
  let errorCount = 0;
  let infoCount = 0;

  for (const conflict of conflicts) {
    if (conflict.kind === 'staff_overlap') {
      const pair = [conflict.eventId, conflict.relatedEventId].sort().join('|');
      const key = `${pair}|${conflict.date}|${conflict.staffMemberId}`;

      if (seenStaffOverlaps.has(key)) {
        continue;
      }

      seenStaffOverlaps.add(key);
    }

    byKind[conflict.kind] += 1;

    if (conflict.severity === 'error') {
      errorCount += 1;
    } else {
      infoCount += 1;
    }
  }

  return { errorCount, infoCount, byKind };
}

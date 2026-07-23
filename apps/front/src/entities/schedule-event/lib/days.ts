import dayjs from 'dayjs';
import type { ScheduleEventDayDto, ScheduleEventDayPayload, ScheduleEventDto } from '../api/types';

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = dayjs(from);
  const end = dayjs(to);
  while (!cursor.isAfter(end)) {
    days.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function shiftDays(
  days: ScheduleEventDayDto[],
  offsetInDays: number,
): ScheduleEventDayPayload[] {
  return days.map((day) => ({
    date: dayjs(day.date).add(offsetInDays, 'day').format('YYYY-MM-DD'),
    startTime: day.startTime ?? undefined,
    endTime: day.endTime ?? undefined,
  }));
}

export function eventCoversDate(event: ScheduleEventDto, date: string): boolean {
  return event.days.some((day) => day.date === date);
}

export function formatDayTime(day: ScheduleEventDayDto): string | null {
  if (!day.startTime || !day.endTime) return null;
  return `${day.startTime}–${day.endTime}`;
}

export type DayTimesKind = 'fullDay' | 'uniform' | 'mixed';

export function summarizeDayTimes(days: ScheduleEventDayDto[]): { kind: DayTimesKind; label: string | null } {
  const firstTime = formatDayTime(days[0]);
  const sameTimeEveryDay = days.every((day) => formatDayTime(day) === firstTime);

  if (!sameTimeEveryDay) return { kind: 'mixed', label: null };
  if (firstTime === null) return { kind: 'fullDay', label: null };
  return { kind: 'uniform', label: firstTime };
}

export function contiguousRuns(days: ScheduleEventDayDto[]): ScheduleEventDayDto[][] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const runs: ScheduleEventDayDto[][] = [];

  for (const day of sorted) {
    const currentRun = runs[runs.length - 1];
    const previousDay = currentRun?.[currentRun.length - 1];
    const isConsecutive = previousDay && dayjs(day.date).diff(dayjs(previousDay.date), 'day') === 1;

    if (isConsecutive) {
      currentRun.push(day);
    } else {
      runs.push([day]);
    }
  }

  return runs;
}

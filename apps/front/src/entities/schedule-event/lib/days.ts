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

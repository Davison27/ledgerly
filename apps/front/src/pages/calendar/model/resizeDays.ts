import {
  daysBetween,
  type ScheduleEventDayDto,
  type ScheduleEventDayPayload,
} from '@/entities/schedule-event';

export function resizeEventDays(
  days: ScheduleEventDayDto[],
  edge: 'start' | 'end',
  targetDate: string,
): ScheduleEventDayPayload[] {
  const currentStart = days[0].date;
  const currentEnd = days[days.length - 1].date;

  const newStart = edge === 'start' ? targetDate : currentStart;
  const newEnd = edge === 'end' ? targetDate : currentEnd;

  const orderedStart = newStart <= newEnd ? newStart : newEnd;
  const orderedEnd = newStart <= newEnd ? newEnd : newStart;

  const existingByDate = new Map(days.map((day) => [day.date, day]));

  return daysBetween(orderedStart, orderedEnd).map((date) => {
    const existing = existingByDate.get(date);
    return {
      date,
      startTime: existing?.startTime ?? undefined,
      endTime: existing?.endTime ?? undefined,
    };
  });
}

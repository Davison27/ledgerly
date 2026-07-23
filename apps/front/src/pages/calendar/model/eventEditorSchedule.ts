import {
  contiguousRuns,
  daysBetween,
  summarizeDayTimes,
  type ScheduleEventDayDto,
  type ScheduleEventDayPayload,
  type ScheduleEventDto,
} from '@/entities/schedule-event';
import { MAX_DERIVED_RANGE_DAYS } from './derivedRanges';

export const MAX_BLOCK_DAYS = MAX_DERIVED_RANGE_DAYS;

export type EventScheduleWarning = 'gaps' | 'mixedTimes';

export interface EventScheduleShape {
  mode: 'single' | 'range';
  startDate: string;
  endDate: string;
  fullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  warnings: EventScheduleWarning[];
}

function sortByDate(days: ScheduleEventDayDto[]): ScheduleEventDayDto[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

export function eventScheduleShape(event: ScheduleEventDto): EventScheduleShape {
  const days = sortByDate(event.days);
  const warnings: EventScheduleWarning[] = [];

  if (contiguousRuns(days).length > 1) warnings.push('gaps');

  const summary = summarizeDayTimes(days);
  if (summary.kind === 'mixed') warnings.push('mixedTimes');

  const timedDay =
    summary.kind === 'mixed' ? days.find((day) => day.startTime && day.endTime) : days[0];
  const fullDay = summary.kind === 'fullDay' || (summary.kind === 'mixed' && !timedDay);

  return {
    mode: event.startDate === event.endDate ? 'single' : 'range',
    startDate: event.startDate,
    endDate: event.endDate,
    fullDay,
    startTime: fullDay ? null : (timedDay?.startTime ?? null),
    endTime: fullDay ? null : (timedDay?.endTime ?? null),
    warnings,
  };
}

export function expandScheduleToDays(
  startDate: string,
  endDate: string,
  fullDay: boolean,
  startTime: string | null,
  endTime: string | null,
): ScheduleEventDayPayload[] {
  return daysBetween(startDate, endDate).map((date) => ({
    date,
    startTime: fullDay ? undefined : (startTime ?? undefined),
    endTime: fullDay ? undefined : (endTime ?? undefined),
  }));
}

import { describe, expect, it } from 'vitest';
import {
  contiguousRuns,
  daysBetween,
  eventCoversDate,
  formatDayTime,
  shiftDays,
  summarizeDayTimes,
} from './days';
import type { ScheduleEventDayDto, ScheduleEventDto } from '../api/types';

const day = (
  date: string,
  startTime: string | null = null,
  endTime: string | null = null,
): ScheduleEventDayDto => ({
  date,
  startTime,
  endTime,
});

describe('schedule day helpers', () => {
  it('returns an inclusive list of ISO dates', () => {
    expect(daysBetween('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });

  it('shifts dates while normalizing nullable times for the API payload', () => {
    expect(shiftDays([day('2026-08-31', '09:00', '17:00'), day('2026-09-01')], 1)).toEqual([
      { date: '2026-09-01', startTime: '09:00', endTime: '17:00' },
      { date: '2026-09-02', startTime: undefined, endTime: undefined },
    ]);
  });

  it('formats only complete time ranges', () => {
    expect(formatDayTime(day('2026-08-01', '09:00', '17:00'))).toBe('09:00–17:00');
    expect(formatDayTime(day('2026-08-01', '09:00'))).toBeNull();
  });

  it('classifies full-day, uniform-time and mixed-time schedules', () => {
    expect(summarizeDayTimes([day('2026-08-01'), day('2026-08-02')])).toEqual({
      kind: 'fullDay',
      label: null,
    });
    expect(
      summarizeDayTimes([day('2026-08-01', '09:00', '17:00'), day('2026-08-02', '09:00', '17:00')]),
    ).toEqual({
      kind: 'uniform',
      label: '09:00–17:00',
    });
    expect(
      summarizeDayTimes([day('2026-08-01', '09:00', '17:00'), day('2026-08-02', '10:00', '18:00')]),
    ).toEqual({
      kind: 'mixed',
      label: null,
    });
  });

  it('sorts and splits non-consecutive dates into contiguous runs', () => {
    expect(
      contiguousRuns([day('2026-08-04'), day('2026-08-01'), day('2026-08-02'), day('2026-08-06')]),
    ).toEqual([[day('2026-08-01'), day('2026-08-02')], [day('2026-08-04')], [day('2026-08-06')]]);
  });

  it('checks whether an event contains a selected date', () => {
    const event = { days: [day('2026-08-01'), day('2026-08-02')] } as ScheduleEventDto;

    expect(eventCoversDate(event, '2026-08-02')).toBe(true);
    expect(eventCoversDate(event, '2026-08-03')).toBe(false);
  });
});

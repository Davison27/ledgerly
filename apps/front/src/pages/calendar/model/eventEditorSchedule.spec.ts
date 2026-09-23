import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from './calendarEditorData';
import { eventScheduleShape, expandScheduleToDays } from './eventEditorSchedule';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    projectId: 'project-1',
    title: 'Install',
    notes: null,
    startDate: '2026-03-02',
    endDate: '2026-03-03',
    project: {
      id: 'project-1',
      displayName: 'Project',
      status: 'active',
      color: null,
    },
    days: [
      { date: '2026-03-02', startTime: '09:00', endTime: '17:00' },
      { date: '2026-03-03', startTime: '09:00', endTime: '17:00' },
    ],
    staff: [],
    equipment: [],
    ...overrides,
  };
}

describe('eventEditorSchedule', () => {
  it('describes a contiguous timed range without warnings', () => {
    expect(eventScheduleShape(event())).toEqual({
      mode: 'range',
      startDate: '2026-03-02',
      endDate: '2026-03-03',
      fullDay: false,
      startTime: '09:00',
      endTime: '17:00',
      warnings: [],
    });
  });

  it('warns when schedule days have gaps or mixed times', () => {
    const result = eventScheduleShape(
      event({
        days: [
          { date: '2026-03-02', startTime: '09:00', endTime: '17:00' },
          { date: '2026-03-04', startTime: '10:00', endTime: '18:00' },
        ],
      }),
    );

    expect(result.warnings).toEqual(['gaps', 'mixedTimes']);
  });

  it('expands an inclusive date range and removes times for full-day events', () => {
    expect(expandScheduleToDays('2026-03-02', '2026-03-04', true, '09:00', '17:00')).toEqual([
      { date: '2026-03-02', startTime: undefined, endTime: undefined },
      { date: '2026-03-03', startTime: undefined, endTime: undefined },
      { date: '2026-03-04', startTime: undefined, endTime: undefined },
    ]);
  });
});

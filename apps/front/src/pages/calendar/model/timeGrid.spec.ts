import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from './calendarEditorData';
import { buildTimedSegments } from './timeGrid';

function editorEvent(): CalendarEvent {
  return {
    id: 'event-1',
    projectId: 'project-1',
    title: null,
    notes: null,
    startDate: '2026-03-02',
    endDate: '2026-03-02',
    project: { id: 'project-1', displayName: 'Project One' },
    days: [{ date: '2026-03-02', startTime: '09:00', endTime: '11:00' }],
    staff: [],
    equipment: [],
  };
}

describe('calendar time grid', () => {
  it('builds timed segments from minimal editor events with the project identifier', () => {
    expect(buildTimedSegments([editorEvent()], ['2026-03-02'])).toMatchObject([
      {
        eventId: 'event-1',
        projectId: 'project-1',
        dayIndex: 0,
        startMinutes: 540,
        endMinutes: 660,
      },
    ]);
  });
});

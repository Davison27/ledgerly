import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from './calendarEditorData';
import { buildEventLaneItems, layoutWeek } from './lanes';

function editorEvent(): CalendarEvent {
  return {
    id: 'event-1',
    projectId: 'project-1',
    title: null,
    notes: null,
    startDate: '2026-03-02',
    endDate: '2026-03-03',
    project: { id: 'project-1', displayName: 'Project One' },
    days: [
      { date: '2026-03-02', startTime: null, endTime: null },
      { date: '2026-03-03', startTime: null, endTime: null },
    ],
    staff: [{ id: 'staff-1', displayName: 'Alex Rivera' }],
    equipment: [{ id: 'equipment-1', displayName: 'Lift', quantity: 1 }],
  };
}

describe('calendar lanes', () => {
  it('lays out minimal editor events and retains their project identifiers', () => {
    const items = buildEventLaneItems([editorEvent()]);

    expect(items).toEqual([
      {
        key: 'event-event-1-0',
        kind: 'event',
        eventId: 'event-1',
        taxDeadlineId: null,
        projectId: 'project-1',
        startDate: '2026-03-02',
        endDate: '2026-03-03',
        ownsStartHandle: true,
        ownsEndHandle: true,
      },
    ]);
    expect(layoutWeek(['2026-03-02', '2026-03-03'], items).bars[0].projectId).toBe('project-1');
  });
});

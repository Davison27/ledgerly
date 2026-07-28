import { buildConflictNotifications, buildUpcomingEventNotifications } from './schedule-notification-rules';
import {
  NotificationScheduleConflictRow,
  NotificationScheduleEventRow,
} from './notification-schedule-reader.port';

function buildEventRow(overrides: Partial<NotificationScheduleEventRow> = {}): NotificationScheduleEventRow {
  return {
    eventId: 'event-1',
    projectId: 'project-1',
    projectName: 'Project One',
    title: 'Load-in',
    date: '2026-07-20',
    ...overrides,
  };
}

function buildConflictRow(overrides: Partial<NotificationScheduleConflictRow> = {}): NotificationScheduleConflictRow {
  return {
    eventId: 'event-1',
    projectId: 'project-1',
    projectName: 'Project One',
    title: 'Load-in',
    date: '2026-07-20',
    kind: 'staff_overlap',
    ...overrides,
  };
}

describe('buildUpcomingEventNotifications', () => {
  it('uses the event title as subject when present', () => {
    const [draft] = buildUpcomingEventNotifications([buildEventRow()]);

    expect(draft.context.subject).toBe('Load-in');
    expect(draft.context.related).toBe('Project One');
    expect(draft.dedupeKey).toBe('schedule_event_upcoming:event-1:2026-07-20');
    expect(draft.resource).toEqual({ kind: 'schedule_event', id: 'event-1', projectId: 'project-1' });
  });

  it('falls back to the project name when the event has no title', () => {
    const [draft] = buildUpcomingEventNotifications([buildEventRow({ title: null })]);

    expect(draft.context.subject).toBe('Project One');
  });
});

describe('buildConflictNotifications', () => {
  it('builds an error notification carrying the conflict kind in the context', () => {
    const [draft] = buildConflictNotifications([buildConflictRow()]);

    expect(draft.type).toBe('schedule_conflict');
    expect(draft.severity).toBe('error');
    expect(draft.context.conflictKind).toBe('staff_overlap');
    expect(draft.dedupeKey).toBe('schedule_conflict:staff_overlap:event-1:2026-07-20');
  });

  it('uses "all" in the dedupe key when the conflict has no date', () => {
    const [draft] = buildConflictNotifications([buildConflictRow({ date: null, kind: 'project_not_active' })]);

    expect(draft.dedupeKey).toBe('schedule_conflict:project_not_active:event-1:all');
    expect(draft.context.date).toBeNull();
  });
});

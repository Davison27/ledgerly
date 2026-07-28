import { NotificationDraft } from './notification-draft';
import {
  NotificationScheduleConflictRow,
  NotificationScheduleEventRow,
} from './notification-schedule-reader.port';
import { buildDedupeKey } from './dedupe-key';

export function buildUpcomingEventNotifications(rows: NotificationScheduleEventRow[]): NotificationDraft[] {
  return rows.map((row) => ({
    dedupeKey: buildDedupeKey('schedule_event_upcoming', row.eventId, row.date),
    type: 'schedule_event_upcoming',
    severity: 'info',
    context: {
      subject: row.title ?? row.projectName,
      related: row.projectName,
      date: row.date,
      amount: null,
      conflictKind: null,
    },
    resource: { kind: 'schedule_event', id: row.eventId, projectId: row.projectId },
  }));
}

export function buildConflictNotifications(rows: NotificationScheduleConflictRow[]): NotificationDraft[] {
  return rows.map((row) => ({
    dedupeKey: buildDedupeKey('schedule_conflict', row.kind, row.eventId, row.date ?? 'all'),
    type: 'schedule_conflict',
    severity: 'error',
    context: {
      subject: row.title ?? row.projectName,
      related: row.projectName,
      date: row.date,
      amount: null,
      conflictKind: row.kind,
    },
    resource: { kind: 'schedule_event', id: row.eventId, projectId: row.projectId },
  }));
}

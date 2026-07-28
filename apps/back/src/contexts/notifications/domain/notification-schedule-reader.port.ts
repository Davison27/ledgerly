import { NotificationConflictKind } from './notification-conflict-kind';

export const NOTIFICATION_SCHEDULE_READER = Symbol('NotificationScheduleReader');

export interface NotificationScheduleEventRow {
  eventId: string;
  projectId: string;
  projectName: string;
  title: string | null;
  date: string;
}

export interface NotificationScheduleConflictRow {
  eventId: string;
  projectId: string;
  projectName: string;
  title: string | null;
  date: string | null;
  kind: NotificationConflictKind;
}

export interface NotificationScheduleReader {
  findUpcomingEvents(from: string, to: string): Promise<NotificationScheduleEventRow[]>;
  findBlockingConflicts(from: string, to: string): Promise<NotificationScheduleConflictRow[]>;
}

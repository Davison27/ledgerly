import type { CalendarEvent, CalendarProjectOption } from './calendarEditorData';

export interface ProjectDragData {
  kind: 'project';
  project: CalendarProjectOption;
}

export interface DerivedProjectDragData {
  kind: 'derived';
  project: CalendarProjectOption;
}

export interface EventDragData {
  kind: 'event';
  event: CalendarEvent;
  date: string;
}

export interface ResizeDragData {
  kind: 'resize';
  event: CalendarEvent;
  edge: 'start' | 'end';
}

export interface StaffDragData {
  kind: 'staff';
  staffMemberId: string;
  name: string;
}

export type CalendarDragData =
  | ProjectDragData
  | DerivedProjectDragData
  | EventDragData
  | ResizeDragData
  | StaffDragData;

export interface DayDropData {
  kind: 'day';
  date: string;
}

export interface EventDropData {
  kind: 'event';
  eventId: string;
}

export type CalendarDropData = DayDropData | EventDropData;

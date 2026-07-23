import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';

export interface ProjectDragData {
  kind: 'project';
  projectId: string;
  projectName: string;
}

export interface DerivedProjectDragData {
  kind: 'derived';
  project: SchedulableProjectDto;
}

export interface EventDragData {
  kind: 'event';
  event: ScheduleEventDto;
  date: string;
}

export interface ResizeDragData {
  kind: 'resize';
  event: ScheduleEventDto;
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

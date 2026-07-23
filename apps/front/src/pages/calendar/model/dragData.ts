import type { ScheduleEventDto } from '@/entities/schedule-event';

export interface ProjectDragData {
  kind: 'project';
  projectId: string;
  projectName: string;
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

export type CalendarDragData = ProjectDragData | EventDragData | ResizeDragData;

export interface DayDropData {
  date: string;
}

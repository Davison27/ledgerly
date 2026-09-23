import { queryOptions } from '@tanstack/react-query';
import {
  getCalendarEditorBoard,
  getScheduleBoard,
  listCalendarEditorEquipment,
  listCalendarEditorProjects,
  listCalendarEditorStaff,
  listScheduleEvents,
  listSchedulableProjects,
} from './schedule.api';
import type { ScheduleEventListFilter } from './types';

export const scheduleQueries = {
  all: ['schedule'] as const,
  board: (from: string, to: string) =>
    queryOptions({
      queryKey: ['schedule', 'board', from, to] as const,
      queryFn: () => getScheduleBoard(from, to),
    }),
  editorBoard: (from: string, to: string) =>
    queryOptions({
      queryKey: ['schedule', 'editor-board', from, to] as const,
      queryFn: () => getCalendarEditorBoard(from, to),
    }),
  events: (filter: ScheduleEventListFilter = {}) =>
    queryOptions({
      queryKey: ['schedule', 'events', filter] as const,
      queryFn: () => listScheduleEvents(filter),
    }),
  schedulableProjects: () =>
    queryOptions({
      queryKey: ['schedule', 'schedulable-projects'] as const,
      queryFn: listSchedulableProjects,
    }),
  editorProjects: () =>
    queryOptions({
      queryKey: ['schedule', 'editor-projects'] as const,
      queryFn: listCalendarEditorProjects,
    }),
  editorStaff: () =>
    queryOptions({
      queryKey: ['schedule', 'editor-staff'] as const,
      queryFn: listCalendarEditorStaff,
    }),
  editorEquipment: () =>
    queryOptions({
      queryKey: ['schedule', 'editor-equipment'] as const,
      queryFn: listCalendarEditorEquipment,
    }),
};

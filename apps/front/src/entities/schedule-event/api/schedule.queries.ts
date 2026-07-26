import { queryOptions } from '@tanstack/react-query';
import { getScheduleBoard, listScheduleEvents, listSchedulableProjects } from './schedule.api';
import type { ScheduleEventListFilter } from './types';

export const scheduleQueries = {
  all: ['schedule'] as const,
  board: (from: string, to: string) =>
    queryOptions({
      queryKey: ['schedule', 'board', from, to] as const,
      queryFn: () => getScheduleBoard(from, to),
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
};

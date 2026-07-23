import { ScheduleEvent } from './schedule-event';

export const SCHEDULE_EVENT_REPOSITORY = Symbol('ScheduleEventRepository');

export interface ScheduleEventFilter {
  from?: string;
  to?: string;
  projectId?: string;
  staffMemberId?: string;
}

export interface ScheduleEventRepository {
  findById(id: string): Promise<ScheduleEvent | null>;
  findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]>;
  save(event: ScheduleEvent): Promise<void>;
  delete(id: string): Promise<void>;
}

import { ScheduleEvent } from './schedule-event';

export const SCHEDULE_EVENT_REPOSITORY = Symbol('ScheduleEventRepository');

export interface ScheduleEventFilter {
  from?: string;
  to?: string;
  projectId?: string;
  staffMemberId?: string;
  excludeStaffAssignments?: boolean;
  excludeEquipmentAssignments?: boolean;
}

export interface ScheduleEventVisibility {
  staff: boolean;
  equipment: boolean;
}

export interface ScheduleEventRepository {
  findById(id: string, visibility?: ScheduleEventVisibility): Promise<ScheduleEvent | null>;
  findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]>;
  save(event: ScheduleEvent): Promise<void>;
  delete(id: string): Promise<void>;
}

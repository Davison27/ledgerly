import { ScheduleEvent } from '../domain/schedule-event';

export type ScheduleAccessLevel = 'none' | 'view' | 'edit';

export interface ScheduleAccessSnapshot {
  projects: ScheduleAccessLevel;
  staff: ScheduleAccessLevel;
  equipment: ScheduleAccessLevel;
}

export interface ScheduleWriteAccess {
  calendar: ScheduleAccessLevel;
}

export function canReadScheduleEvent(event: ScheduleEvent, access: ScheduleAccessSnapshot): boolean {
  return (
    access.projects !== 'none' &&
    (event.staffMemberIds.length === 0 || access.staff !== 'none') &&
    (event.equipment.length === 0 || access.equipment !== 'none')
  );
}

export function canWriteSchedule(access: ScheduleWriteAccess): boolean {
  return access.calendar === 'edit';
}

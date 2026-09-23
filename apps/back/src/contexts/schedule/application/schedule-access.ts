import { ScheduleEvent } from '../domain/schedule-event';

export type ScheduleAccessLevel = 'none' | 'view' | 'edit';

export interface ScheduleAccessSnapshot {
  projects: ScheduleAccessLevel;
  staff: ScheduleAccessLevel;
  equipment: ScheduleAccessLevel;
}

export function canReadScheduleEvent(event: ScheduleEvent, access: ScheduleAccessSnapshot): boolean {
  return (
    access.projects !== 'none' &&
    (event.staffMemberIds.length === 0 || access.staff !== 'none') &&
    (event.equipment.length === 0 || access.equipment !== 'none')
  );
}

export function canEditScheduleEvent(event: ScheduleEvent, access: ScheduleAccessSnapshot): boolean {
  return canEditScheduleSections(access, event.staffMemberIds, event.equipment.map(({ equipmentId }) => equipmentId));
}

export function canEditScheduleSections(
  access: ScheduleAccessSnapshot,
  staffMemberIds: string[],
  equipmentIds: string[],
): boolean {
  return (
    access.projects === 'edit' &&
    (staffMemberIds.length === 0 || access.staff === 'edit') &&
    (equipmentIds.length === 0 || access.equipment === 'edit')
  );
}

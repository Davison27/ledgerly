import { NotificationAccessSnapshot } from '../../domain/notification-access';

function canView(level: NotificationAccessSnapshot[keyof NotificationAccessSnapshot]): string {
  return level === 'none' ? 'FALSE' : 'TRUE';
}

export function notificationVisibilityCondition(
  access: NotificationAccessSnapshot,
  alias: string,
): string {
  const projects = canView(access.projects);
  const calendar = canView(access.calendar);
  const documents = canView(access.documents);
  const staff = canView(access.staff);
  const equipment = canView(access.equipment);
  const hasFullScheduleAccess = access.staff !== 'none' && access.equipment !== 'none';
  const scheduleAssignments = hasFullScheduleAccess
    ? 'TRUE'
    : `EXISTS (
        SELECT 1
        FROM schedule_events schedule_event
        WHERE schedule_event.id = ${alias}.resource_id
          AND schedule_event.project_id = ${alias}.resource_project_id
          AND (${staff} OR NOT EXISTS (
            SELECT 1 FROM schedule_event_staff schedule_staff
            WHERE schedule_staff.event_id = schedule_event.id
          ))
          AND (${equipment} OR NOT EXISTS (
            SELECT 1 FROM schedule_event_equipment schedule_equipment
            WHERE schedule_equipment.event_id = schedule_event.id
          ))
      )`;

  return `(
    (${alias}.resource_kind = 'document' AND ${projects} AND ${documents})
    OR (${alias}.resource_kind = 'staff_member' AND ${staff} AND ${documents})
    OR (${alias}.resource_kind = 'none' AND ${alias}.type = 'document_extraction_failed' AND ${documents})
    OR (
      ${alias}.resource_kind = 'schedule_event'
      AND ${projects}
      AND ${calendar}
      AND ${scheduleAssignments}
      AND (
        ${alias}.context_conflict_kind IS NULL
        OR ${alias}.context_conflict_kind = 'project_not_active'
        OR (${alias}.context_conflict_kind IN ('staff_not_hired', 'outside_project_dates', 'staff_overlap') AND ${staff})
        OR (${alias}.context_conflict_kind IN ('equipment_overallocated', 'equipment_stock_unset') AND ${equipment})
      )
    )
  )`;
}

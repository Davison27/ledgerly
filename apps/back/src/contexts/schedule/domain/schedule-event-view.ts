import { ScheduleEvent } from './schedule-event';
import { ScheduleProjectView } from './schedule-project-reader.port';
import { ScheduleStaffView } from './schedule-staff-reader.port';
import { ScheduleEquipmentView } from './schedule-equipment-reader.port';

export interface ScheduleEventView {
  event: ScheduleEvent;
  project: ScheduleProjectView;
  staff: ScheduleStaffView[];
  equipment: Array<ScheduleEquipmentView & { quantity: number }>;
}

export interface ScheduleEventViewSources {
  projects: ScheduleProjectView[];
  staff: ScheduleStaffView[];
  equipment: ScheduleEquipmentView[];
}

export function buildScheduleEventViews(
  events: ScheduleEvent[],
  sources: ScheduleEventViewSources,
): ScheduleEventView[] {
  const projectsById = new Map(sources.projects.map((project) => [project.id, project]));
  const staffById = new Map(sources.staff.map((member) => [member.id, member]));
  const equipmentById = new Map(sources.equipment.map((equipment) => [equipment.id, equipment]));

  return events.map((event) => ({
    event,
    project: projectsById.get(event.projectId) as ScheduleProjectView,
    staff: event.staffMemberIds
      .map((staffMemberId) => staffById.get(staffMemberId))
      .filter((member): member is ScheduleStaffView => member !== undefined),
    equipment: event.equipment
      .map((equipment) => {
        const equipmentView = equipmentById.get(equipment.equipmentId);

        return equipmentView !== undefined ? { ...equipmentView, quantity: equipment.quantity } : null;
      })
      .filter((equipment): equipment is ScheduleEquipmentView & { quantity: number } => equipment !== null),
  }));
}

import { ScheduleEventDay } from './schedule-event-day';
import { ScheduleEventView } from './schedule-event-view';
import { ScheduleProjectView } from './schedule-project-reader.port';
import { ScheduleStaffView } from './schedule-staff-reader.port';
import { ScheduleConflict } from './schedule-conflict';

export interface ScheduleConflictRange {
  from: string;
  to: string;
}

function isWithinRange(date: string, range: ScheduleConflictRange): boolean {
  return date >= range.from && date <= range.to;
}

function isWithinProjectDates(date: string, project: ScheduleProjectView): boolean {
  if (project.startDate !== null && date < project.startDate) {
    return false;
  }

  if (project.endDate !== null && date > project.endDate) {
    return false;
  }

  return true;
}

function isStaffHired(date: string, staff: ScheduleStaffView): boolean {
  if (staff.hireDate !== null && date < staff.hireDate) {
    return false;
  }

  if (staff.endDate !== null && date > staff.endDate) {
    return false;
  }

  return true;
}

function findDayForDate(days: ScheduleEventDay[], date: string): ScheduleEventDay | undefined {
  return days.find((day) => day.date === date);
}

export function detectScheduleConflicts(
  views: ScheduleEventView[],
  range: ScheduleConflictRange,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (const view of views) {
    const daysInRange = view.event.days.filter((day) => isWithinRange(day.date, range));

    if (daysInRange.length === 0) {
      continue;
    }

    if (view.project.status !== 'active') {
      conflicts.push({
        kind: 'project_not_active',
        severity: 'error',
        eventId: view.event.id,
        date: null,
        staffMemberId: null,
        equipmentId: null,
        relatedEventId: null,
        stock: null,
        allocated: null,
      });
    }

    for (const day of daysInRange) {
      if (!isWithinProjectDates(day.date, view.project)) {
        conflicts.push({
          kind: 'outside_project_dates',
          severity: 'error',
          eventId: view.event.id,
          date: day.date,
          staffMemberId: null,
          equipmentId: null,
          relatedEventId: null,
          stock: null,
          allocated: null,
        });
      }

      for (const staffMemberId of view.event.staffMemberIds) {
        const staff = view.staff.find((member) => member.id === staffMemberId);

        if (staff !== undefined && !isStaffHired(day.date, staff)) {
          conflicts.push({
            kind: 'staff_not_hired',
            severity: 'error',
            eventId: view.event.id,
            date: day.date,
            staffMemberId,
            equipmentId: null,
            relatedEventId: null,
            stock: null,
            allocated: null,
          });
        }

        for (const other of views) {
          if (other.event.id === view.event.id || !other.event.staffMemberIds.includes(staffMemberId)) {
            continue;
          }

          const otherDay = findDayForDate(other.event.days, day.date);

          if (otherDay !== undefined && day.overlapsWith(otherDay)) {
            conflicts.push({
              kind: 'staff_overlap',
              severity: 'error',
              eventId: view.event.id,
              date: day.date,
              staffMemberId,
              equipmentId: null,
              relatedEventId: other.event.id,
              stock: null,
              allocated: null,
            });
          }
        }
      }

      for (const equipment of view.equipment) {
        const allocated = views.reduce((sum, other) => {
          const otherDay = findDayForDate(other.event.days, day.date);

          if (otherDay === undefined || !day.overlapsWith(otherDay)) {
            return sum;
          }

          const otherEquipment = other.event.equipment.find((candidate) => candidate.equipmentId === equipment.id);

          return otherEquipment !== undefined ? sum + otherEquipment.quantity : sum;
        }, 0);

        if (equipment.stock > 0 && allocated > equipment.stock) {
          conflicts.push({
            kind: 'equipment_overallocated',
            severity: 'error',
            eventId: view.event.id,
            date: day.date,
            staffMemberId: null,
            equipmentId: equipment.id,
            relatedEventId: null,
            stock: equipment.stock,
            allocated,
          });
        } else if (equipment.stock === 0) {
          conflicts.push({
            kind: 'equipment_stock_unset',
            severity: 'info',
            eventId: view.event.id,
            date: day.date,
            staffMemberId: null,
            equipmentId: equipment.id,
            relatedEventId: null,
            stock: equipment.stock,
            allocated,
          });
        }
      }
    }
  }

  return conflicts;
}

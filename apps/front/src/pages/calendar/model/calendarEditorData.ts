import type {
  ScheduleBoardDto,
  ScheduleEditorBoardDto,
  ScheduleEditorSelectorDto,
  ScheduleEventDayDto,
  ScheduleEventDto,
  ScheduleProjectStatus,
  SchedulableProjectDto,
} from '@/entities/schedule-event';
import type { EquipmentDto } from '@/entities/equipment';
import type { StaffMemberDto } from '@/entities/staff-member';

export interface CalendarProjectOption {
  id: string;
  displayName: string;
  code?: string;
  image?: string | null;
  status?: ScheduleProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  color?: string | null;
  hasEvents?: boolean;
}

export interface CalendarStaffOption {
  id: string;
  displayName: string;
}

export interface CalendarEquipmentOption {
  id: string;
  displayName: string;
  stock?: number;
}

export interface CalendarEvent {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  project: {
    id: string;
    displayName: string;
    status?: ScheduleProjectStatus;
    color?: string | null;
  };
  days: ScheduleEventDayDto[];
  staff: CalendarStaffOption[];
  equipment: (CalendarEquipmentOption & { quantity: number })[];
}

export interface CalendarBoard {
  events: CalendarEvent[];
  conflicts: ScheduleBoardDto['conflicts'];
  summary: ScheduleBoardDto['summary'];
}

const EMPTY_SUMMARY: ScheduleBoardDto['summary'] = {
  errorCount: 0,
  infoCount: 0,
  byKind: {
    staff_not_hired: 0,
    outside_project_dates: 0,
    staff_overlap: 0,
    project_not_active: 0,
    equipment_overallocated: 0,
    equipment_stock_unset: 0,
  },
};

function displayStaffName(staffMember: Pick<StaffMemberDto, 'firstName' | 'lastName'>): string {
  return `${staffMember.firstName} ${staffMember.lastName}`.trim();
}

function mapScheduleEvent(event: ScheduleEventDto): CalendarEvent {
  return {
    id: event.id,
    projectId: event.projectId,
    title: event.title,
    notes: event.notes,
    startDate: event.startDate,
    endDate: event.endDate,
    project: {
      id: event.project.id,
      displayName: event.project.name,
      status: event.project.status,
      color: event.project.color,
    },
    days: event.days,
    staff: event.staff.map((staffMember) => ({
      id: staffMember.id,
      displayName: displayStaffName(staffMember),
    })),
    equipment: event.equipment.map((equipment) => ({
      id: equipment.equipmentId,
      displayName: equipment.name,
      quantity: equipment.quantity,
      stock: equipment.stock,
    })),
  };
}

export function mapFullCalendarBoard(board: ScheduleBoardDto): CalendarBoard {
  return {
    ...board,
    events: board.events.map(mapScheduleEvent),
  };
}

export function mapEditorCalendarBoard(board: ScheduleEditorBoardDto): CalendarBoard {
  return {
    events: board.map((event) => ({
      id: event.id,
      projectId: event.projectId,
      title: event.title,
      notes: event.notes,
      startDate: event.startDate,
      endDate: event.endDate,
      project: event.project,
      days: event.days,
      staff: event.staff,
      equipment: event.equipment,
    })),
    conflicts: [],
    summary: EMPTY_SUMMARY,
  };
}

export function mapFullProjectOption(project: SchedulableProjectDto): CalendarProjectOption {
  return {
    id: project.id,
    displayName: project.name,
    code: project.code,
    image: project.image,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    color: project.color,
    hasEvents: project.hasEvents,
  };
}

export function mapSelectorOption(option: ScheduleEditorSelectorDto): { id: string; displayName: string } {
  return { id: option.id, displayName: option.displayName };
}

export function mapFullStaffOption(staffMember: StaffMemberDto): CalendarStaffOption {
  return { id: staffMember.id, displayName: displayStaffName(staffMember) };
}

export function mapFullEquipmentOption(equipment: EquipmentDto): CalendarEquipmentOption {
  return { id: equipment.id, displayName: equipment.name, stock: equipment.stock };
}

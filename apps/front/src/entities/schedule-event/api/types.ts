export type ScheduleProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type ScheduleConflictKind =
  | 'staff_not_hired'
  | 'outside_project_dates'
  | 'staff_overlap'
  | 'project_not_active'
  | 'equipment_overallocated'
  | 'equipment_stock_unset';

export type ScheduleConflictSeverity = 'error' | 'info';

export interface ScheduleConflictDto {
  kind: ScheduleConflictKind;
  severity: ScheduleConflictSeverity;
  eventId: string;
  date: string | null;
  staffMemberId: string | null;
  equipmentId: string | null;
  relatedEventId: string | null;
  stock: number | null;
  allocated: number | null;
}

export interface ScheduleBoardSummaryDto {
  errorCount: number;
  infoCount: number;
  byKind: Record<ScheduleConflictKind, number>;
}

export interface ScheduleEventDayDto {
  date: string;
  startTime: string | null;
  endTime: string | null;
}

export interface ScheduleEventProjectDto {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: ScheduleProjectStatus;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
}

export interface ScheduleEventStaffDto {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ScheduleEventEquipmentDto {
  equipmentId: string;
  name: string;
  quantity: number;
  stock: number;
}

export interface ScheduleEventDto {
  id: string;
  projectId: string;
  title: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  project: ScheduleEventProjectDto;
  days: ScheduleEventDayDto[];
  staff: ScheduleEventStaffDto[];
  equipment: ScheduleEventEquipmentDto[];
}

export interface ScheduleBoardDto {
  events: ScheduleEventDto[];
  conflicts: ScheduleConflictDto[];
  summary: ScheduleBoardSummaryDto;
}

export interface SchedulableProjectDto {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: ScheduleProjectStatus;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
  hasEvents: boolean;
}

export interface ScheduleEventDayPayload {
  date: string;
  startTime?: string;
  endTime?: string;
}

export interface ScheduleEventEquipmentPayload {
  equipmentId: string;
  quantity: number;
}

export interface CreateScheduleEventPayload {
  projectId: string;
  title?: string;
  notes?: string;
  days: ScheduleEventDayPayload[];
  staffMemberIds: string[];
  equipment: ScheduleEventEquipmentPayload[];
}

export interface UpdateScheduleEventPayload {
  projectId?: string;
  title?: string | null;
  notes?: string | null;
  days?: ScheduleEventDayPayload[];
  staffMemberIds?: string[];
  equipment?: ScheduleEventEquipmentPayload[];
}

export interface ScheduleEventListFilter {
  from?: string;
  to?: string;
  projectId?: string;
  staffMemberId?: string;
}

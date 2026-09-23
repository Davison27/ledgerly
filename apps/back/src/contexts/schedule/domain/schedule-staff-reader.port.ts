export const SCHEDULE_STAFF_READER = Symbol('ScheduleStaffReader');

export interface ScheduleStaffView {
  id: string;
  firstName: string;
  lastName: string;
  hireDate: string | null;
  endDate: string | null;
}

export interface ScheduleStaffEditorOption {
  id: string;
  displayName: string;
}

export interface ScheduleStaffReader {
  findByIds(ids: string[]): Promise<ScheduleStaffView[]>;
}

export interface ScheduleStaffEditorReader {
  findEditorOptions(): Promise<ScheduleStaffEditorOption[]>;
  findEditorLabelsByIds(ids: string[]): Promise<ScheduleStaffEditorOption[]>;
}

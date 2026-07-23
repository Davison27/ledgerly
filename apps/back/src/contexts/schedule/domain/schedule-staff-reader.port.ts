export const SCHEDULE_STAFF_READER = Symbol('ScheduleStaffReader');

export interface ScheduleStaffView {
  id: string;
  firstName: string;
  lastName: string;
  hireDate: string | null;
  endDate: string | null;
}

export interface ScheduleStaffReader {
  findByIds(ids: string[]): Promise<ScheduleStaffView[]>;
}

export const SCHEDULE_PROJECT_READER = Symbol('ScheduleProjectReader');

export interface ScheduleProjectView {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface ScheduleProjectReader {
  findActive(): Promise<ScheduleProjectView[]>;
  findByIds(ids: string[]): Promise<ScheduleProjectView[]>;
}

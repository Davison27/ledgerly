export const SCHEDULE_PROJECT_READER = Symbol('ScheduleProjectReader');

export interface ScheduleProjectView {
  id: string;
  name: string;
  code: string;
  image: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
}

export interface SchedulableProjectView extends ScheduleProjectView {
  hasEvents: boolean;
}

export interface ScheduleProjectEditorOption {
  id: string;
  displayName: string;
}

export interface ScheduleProjectReader {
  findActive(): Promise<SchedulableProjectView[]>;
  findByIds(ids: string[]): Promise<ScheduleProjectView[]>;
}

export interface ScheduleProjectEditorReader {
  findEditorOptions(): Promise<ScheduleProjectEditorOption[]>;
  findEditorLabelsByIds(ids: string[]): Promise<ScheduleProjectEditorOption[]>;
}

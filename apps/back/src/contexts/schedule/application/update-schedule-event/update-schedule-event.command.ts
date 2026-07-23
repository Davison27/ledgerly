import {
  CreateScheduleEventDayCommand,
  CreateScheduleEventProductCommand,
} from '../create-schedule-event/create-schedule-event.command';

export interface UpdateScheduleEventCommand {
  id: string;
  projectId?: string;
  title?: string | null;
  notes?: string | null;
  days?: CreateScheduleEventDayCommand[];
  staffMemberIds?: string[];
  products?: CreateScheduleEventProductCommand[];
}

export interface CreateScheduleEventDayCommand {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface CreateScheduleEventProductCommand {
  productId: string;
  quantity: number;
}

export interface CreateScheduleEventCommand {
  projectId: string;
  title?: string | null;
  notes?: string | null;
  days: CreateScheduleEventDayCommand[];
  staffMemberIds?: string[];
  products?: CreateScheduleEventProductCommand[];
}

export interface CreateScheduleEventDayCommand {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface CreateScheduleEventEquipmentCommand {
  equipmentId: string;
  quantity: number;
}

export interface CreateScheduleEventCommand {
  projectId: string;
  title?: string | null;
  notes?: string | null;
  days: CreateScheduleEventDayCommand[];
  staffMemberIds?: string[];
  equipment?: CreateScheduleEventEquipmentCommand[];
}

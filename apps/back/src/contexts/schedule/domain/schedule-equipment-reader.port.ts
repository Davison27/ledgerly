export const SCHEDULE_EQUIPMENT_READER = Symbol('ScheduleEquipmentReader');

export interface ScheduleEquipmentView {
  id: string;
  name: string;
  stock: number;
}

export interface ScheduleEquipmentReader {
  findByIds(ids: string[]): Promise<ScheduleEquipmentView[]>;
}

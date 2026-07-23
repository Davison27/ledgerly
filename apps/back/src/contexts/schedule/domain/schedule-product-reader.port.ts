export const SCHEDULE_PRODUCT_READER = Symbol('ScheduleProductReader');

export interface ScheduleProductView {
  id: string;
  name: string;
  stock: number;
}

export interface ScheduleProductReader {
  findByIds(ids: string[]): Promise<ScheduleProductView[]>;
}

import { IsInt, IsUUID, Min } from 'class-validator';

export class ScheduleEventEquipmentDto {
  @IsUUID()
  equipmentId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

import { IsInt, IsUUID, Min } from 'class-validator';

export class ScheduleEventProductDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

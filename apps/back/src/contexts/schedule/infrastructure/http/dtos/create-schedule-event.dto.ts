import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ScheduleEventDayDto } from './schedule-event-day.dto';
import { ScheduleEventEquipmentDto } from './schedule-event-equipment.dto';

export class CreateScheduleEventDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => ScheduleEventDayDto)
  @ArrayMinSize(1)
  days: ScheduleEventDayDto[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  staffMemberIds?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEventEquipmentDto)
  equipment?: ScheduleEventEquipmentDto[];
}

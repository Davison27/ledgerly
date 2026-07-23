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
import { ScheduleEventProductDto } from './schedule-event-product.dto';

export class UpdateScheduleEventDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEventDayDto)
  @ArrayMinSize(1)
  days?: ScheduleEventDayDto[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  staffMemberIds?: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEventProductDto)
  products?: ScheduleEventProductDto[];
}

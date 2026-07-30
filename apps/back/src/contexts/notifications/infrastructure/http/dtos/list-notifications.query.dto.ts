import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;

export class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SIZE)
  size: number = DEFAULT_SIZE;

  @IsOptional()
  @IsIn(['unread', 'open', 'resolved', 'all'])
  status: 'unread' | 'open' | 'resolved' | 'all' = 'open';
}

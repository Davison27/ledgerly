import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetCompanyDashboardQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

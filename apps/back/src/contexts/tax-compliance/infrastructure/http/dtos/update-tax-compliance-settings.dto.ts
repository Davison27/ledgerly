import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTaxComplianceSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  internalLeadDays?: number;
}

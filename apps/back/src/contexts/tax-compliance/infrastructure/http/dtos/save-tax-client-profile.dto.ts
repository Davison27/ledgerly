import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TAX_COUNTRY_CODES, TAX_ENTITY_TYPES } from '../../../domain/tax-client-profile';

export class SaveTaxClientProfileDto {
  @IsIn(TAX_COUNTRY_CODES)
  countryCode: (typeof TAX_COUNTRY_CODES)[number];

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,20}$/)
  regionCode?: string | null;

  @IsIn(TAX_ENTITY_TYPES)
  entityType: (typeof TAX_ENTITY_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @IsString({ each: true })
  obligationKeys: string[];
}

import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PROJECT_TYPES, ProjectType } from '../../../domain/project-type';
import { PROJECT_STATUSES, ProjectStatus } from '../../../domain/project-status';
import { PROJECT_CURRENCIES, ProjectCurrency } from '../../../domain/project-currency';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsIn(PROJECT_TYPES)
  type: ProjectType;

  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  clientCompany?: string | null;

  @IsOptional()
  @IsString()
  clientTaxId?: string | null;

  @IsOptional()
  @IsString()
  contactName?: string | null;

  @IsOptional()
  @IsEmail()
  contactEmail?: string | null;

  @IsOptional()
  @IsString()
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN)
  startDate?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number | null;

  @IsOptional()
  @IsIn(PROJECT_CURRENCIES)
  currency?: ProjectCurrency;

  @IsOptional()
  @IsString()
  fiscalYear?: string | null;

  @IsOptional()
  @IsString()
  manager?: string | null;

  @IsOptional()
  @IsString()
  image?: string | null;
}

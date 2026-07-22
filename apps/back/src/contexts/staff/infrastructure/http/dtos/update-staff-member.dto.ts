import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateStaffMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  taxId?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  position?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN)
  hireDate?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN)
  endDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateStaffDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  issueDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  expiryDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

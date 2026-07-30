import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateStaffDocumentDto {
  @IsUUID()
  typeId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  issueDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

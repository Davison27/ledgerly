import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateStaffDocumentDto {
  @IsUUID()
  typeId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(DATE_PATTERN)
  issueDate: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

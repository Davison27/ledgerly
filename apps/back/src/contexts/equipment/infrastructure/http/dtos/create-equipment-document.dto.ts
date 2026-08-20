import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEquipmentDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  issueDate?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN)
  expiryDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

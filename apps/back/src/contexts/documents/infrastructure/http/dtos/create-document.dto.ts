import { IsIn, IsInt, IsNotEmpty, IsNumber, IsString, Matches, Max, Min } from 'class-validator';
import { DOCUMENT_TYPES, DocumentType } from '../../../domain/document-type';
import { DOCUMENT_STATUSES, DocumentStatus } from '../../../domain/document-status';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(DOCUMENT_TYPES)
  type: DocumentType;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsIn(DOCUMENT_STATUSES)
  status: DocumentStatus;
}

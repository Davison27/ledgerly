import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DOCUMENT_TYPES, DocumentType } from '../../../domain/document-type';
import { DOCUMENT_STATUSES, DocumentStatus } from '../../../domain/document-status';
import { DOCUMENT_DIRECTIONS, DocumentDirection } from '../../../domain/document-direction';
import { PageQueryDto } from '../../../../../shared/infrastructure/http/dtos/page.query.dto';

export class ListDocumentsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;

  @IsOptional()
  @IsIn(DOCUMENT_STATUSES)
  status?: DocumentStatus;

  @IsOptional()
  @IsIn(DOCUMENT_DIRECTIONS)
  direction?: DocumentDirection;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMax?: number;
}

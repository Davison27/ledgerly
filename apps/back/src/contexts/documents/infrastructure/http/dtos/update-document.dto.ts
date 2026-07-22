import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { DOCUMENT_TYPES, DocumentType } from '../../../domain/document-type';
import { DOCUMENT_STATUSES, DocumentStatus } from '../../../domain/document-status';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from '../../../domain/document-currency';
import { DOCUMENT_DIRECTIONS, DocumentDirection } from '../../../domain/document-direction';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mirrors CreateDocumentDto's editable fields (D2), with `@IsOptional()` on
 * every one of them (absence = leave untouched). Deliberately does NOT
 * declare `month` (derived server-side from `date`, D4), `projectId`
 * (not editable, C2), or any file field (`fileName`/`mimeType`/`fileSize`)
 * — editing is JSON-only, no `FileInterceptor` (C1). With
 * `forbidNonWhitelisted: true` on the global ValidationPipe, sending any of
 * those returns 400, which is the intended trap-door (D4).
 */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  type?: DocumentType;

  @IsOptional()
  @IsIn(DOCUMENT_DIRECTIONS)
  direction?: DocumentDirection;

  @IsOptional()
  @IsIn(DOCUMENT_STATUSES)
  status?: DocumentStatus;

  @IsOptional()
  @Matches(DATE_PATTERN)
  date?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  dueDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxBase?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  irpfRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  irpfAmount?: number | null;

  @IsOptional()
  @IsIn(DOCUMENT_CURRENCIES)
  currency?: DocumentCurrency;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  issuerName?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  issuerTaxId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  invoiceNumber?: string | null;

  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  staffMemberId?: string | null;
}

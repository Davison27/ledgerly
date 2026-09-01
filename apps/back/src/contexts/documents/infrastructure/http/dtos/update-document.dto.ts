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
import { CREATABLE_DOCUMENT_TYPES, CreatableDocumentType } from '../../../domain/document-type';
import { DOCUMENT_STATUSES, DocumentStatus } from '../../../domain/document-status';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from '../../../domain/document-currency';
import { DOCUMENT_DIRECTIONS, DocumentDirection } from '../../../domain/document-direction';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(CREATABLE_DOCUMENT_TYPES)
  type?: CreatableDocumentType;

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

}

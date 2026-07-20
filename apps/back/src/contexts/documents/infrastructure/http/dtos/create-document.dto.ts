import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DOCUMENT_TYPES, DocumentType } from '../../../domain/document-type';
import { DOCUMENT_STATUSES, DocumentStatus } from '../../../domain/document-status';
import { DOCUMENT_CURRENCIES, DocumentCurrency } from '../../../domain/document-currency';
import { DOCUMENT_DIRECTIONS, DocumentDirection } from '../../../domain/document-direction';

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

  @IsIn(DOCUMENT_DIRECTIONS)
  direction: DocumentDirection;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  issuerName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  issuerTaxId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  invoiceNumber?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxBase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  irpfRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  irpfAmount?: number;

  @IsOptional()
  @IsIn(DOCUMENT_CURRENCIES)
  currency?: DocumentCurrency;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

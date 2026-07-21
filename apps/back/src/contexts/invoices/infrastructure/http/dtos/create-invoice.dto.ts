import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateInvoiceLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  projectId: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  @ArrayMinSize(1)
  lines: CreateInvoiceLineDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  irpfRate?: number;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerTaxId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

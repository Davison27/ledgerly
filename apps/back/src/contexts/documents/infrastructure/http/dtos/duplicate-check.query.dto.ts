import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class DuplicateCheckQueryDto {
  @IsOptional()
  @IsString()
  issuerName?: string;

  @IsOptional()
  @IsString()
  issuerTaxId?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;
}

import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../../../../shared/infrastructure/http/dtos/page.query.dto';

export class DuplicateCheckQueryDto extends PageQueryDto {
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

import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class SaveProjectProductDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leaseExpense?: number | null;

  @IsOptional()
  @IsDateString()
  leaseExpenseDate?: string | null;
}

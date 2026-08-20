import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class SaveProjectEquipmentDto {
  @IsUUID()
  equipmentId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leaseExpense?: number | null;

  @IsOptional()
  @IsDateString()
  leaseExpenseDate?: string | null;
}

import { IsOptional, IsUUID } from 'class-validator';

export class ListStaffDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  typeId?: string;
}

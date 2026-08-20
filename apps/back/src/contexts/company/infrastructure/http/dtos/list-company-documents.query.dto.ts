import { IsOptional, IsUUID } from 'class-validator';

export class ListCompanyDocumentsQueryDto {
  @IsOptional()
  @IsUUID()
  typeId?: string;
}

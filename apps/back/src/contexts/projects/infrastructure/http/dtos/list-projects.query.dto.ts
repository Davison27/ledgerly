import { IsOptional, IsUUID } from 'class-validator';

export class ListProjectsQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

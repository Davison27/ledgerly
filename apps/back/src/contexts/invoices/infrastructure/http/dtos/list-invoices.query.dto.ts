import { IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../../../../../shared/infrastructure/http/dtos/page.query.dto';

export class ListInvoicesQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

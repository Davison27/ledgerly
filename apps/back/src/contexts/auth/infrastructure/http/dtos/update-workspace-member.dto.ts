import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PermissionMatrixDto } from './permission-matrix.dto';

const ROLES = ['admin', 'member'] as const;
const STATUSES = ['invited', 'active', 'disabled'] as const;

export class UpdateWorkspaceMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionMatrixDto)
  permissions?: PermissionMatrixDto;

  @IsOptional()
  @IsIn(STATUSES)
  status?: 'invited' | 'active' | 'disabled';
}

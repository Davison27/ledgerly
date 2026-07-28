import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PermissionMatrixDto } from './permission-matrix.dto';

const ROLES = ['admin', 'editor', 'viewer', 'custom'] as const;
const STATUSES = ['invited', 'active', 'disabled'] as const;

export class UpdateWorkspaceMemberDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: 'admin' | 'editor' | 'viewer' | 'custom';

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionMatrixDto)
  permissions?: PermissionMatrixDto;

  @IsOptional()
  @IsIn(STATUSES)
  status?: 'invited' | 'active' | 'disabled';
}

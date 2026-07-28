import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PermissionMatrixDto } from './permission-matrix.dto';

const ROLES = ['admin', 'editor', 'viewer', 'custom'] as const;

export class InviteWorkspaceMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsIn(ROLES)
  role: 'admin' | 'editor' | 'viewer' | 'custom';

  @ValidateNested()
  @Type(() => PermissionMatrixDto)
  permissions: PermissionMatrixDto;
}

import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
import { PermissionMatrixDto } from './permission-matrix.dto';

const ROLES = ['admin', 'member'] as const;

export class InviteWorkspaceMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsIn(ROLES)
  role: (typeof ROLES)[number];

  @ValidateNested()
  @Type(() => PermissionMatrixDto)
  permissions: PermissionMatrixDto;
}

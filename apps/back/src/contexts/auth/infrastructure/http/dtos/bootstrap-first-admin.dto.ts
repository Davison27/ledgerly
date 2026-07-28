import { IsEmail, MaxLength } from 'class-validator';

export class BootstrapFirstAdminDto {
  @IsEmail()
  @MaxLength(320)
  email: string;
}

import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartGoogleLoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  redirectTo?: string;

  @IsOptional()
  @IsEmail()
  loginHint?: string;
}

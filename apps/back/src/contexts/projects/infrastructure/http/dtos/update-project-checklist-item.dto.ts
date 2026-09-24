import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';

export class UpdateProjectChecklistItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

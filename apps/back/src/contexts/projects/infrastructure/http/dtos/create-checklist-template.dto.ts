import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChecklistTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(500, { each: true })
  items?: string[];
}

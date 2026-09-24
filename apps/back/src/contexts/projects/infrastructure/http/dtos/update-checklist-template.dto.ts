import { IsArray, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateChecklistTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(500, { each: true })
  items: string[];
}

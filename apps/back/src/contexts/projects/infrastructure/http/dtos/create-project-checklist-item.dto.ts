import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}

import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class SubmitDailySentenceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/\S/)
  answer!: string;
}

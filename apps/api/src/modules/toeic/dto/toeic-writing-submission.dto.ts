import { IsString, Length, MaxLength } from 'class-validator';

export class SubmitToeicWritingDto {
  @IsString()
  @Length(1, 20_000)
  @MaxLength(20_000)
  text!: string;
}

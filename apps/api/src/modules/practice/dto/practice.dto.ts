import { IsIn, IsString, Matches } from 'class-validator';

export class StartPracticeDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{8,80}$/)
  clientSessionId!: string;
}

export class AnswerPracticeDto {
  @IsString()
  @Matches(/^p[1-5]$/)
  questionId!: string;

  @IsIn(['a', 'b', 'c'])
  selectedOption!: string;
}

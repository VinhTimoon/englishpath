import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

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

export class ErrorNotebookQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size = 20;

  @IsOptional()
  @IsIn(['PRACTICE', 'TOEIC_TIMED_TEST'])
  source?: 'PRACTICE' | 'TOEIC_TIMED_TEST';
}

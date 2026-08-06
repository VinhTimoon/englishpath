import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ToeicPart } from '../../../generated/prisma/enums';

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export class StartToeicListeningPracticeDto {
  @IsString()
  @Length(8, 128)
  @Matches(IDENTIFIER)
  clientSessionId!: string;

  @IsOptional()
  @IsEnum(ToeicPart)
  listeningPart?: ToeicPart;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  questionCount = 10;
}

export class AnswerToeicListeningPracticeDto {
  @IsString()
  @Length(1, 191)
  @Matches(IDENTIFIER)
  questionId!: string;

  @IsString()
  @Length(1, 1)
  @Matches(/^[A-F]$/)
  selectedOption!: string;
}

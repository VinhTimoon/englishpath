import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ToeicPart } from '../../../generated/prisma/enums';
import { ToeicDifficulty } from '../../../generated/prisma/enums';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const READING_PARTS = [ToeicPart.PART_5, ToeicPart.PART_6, ToeicPart.PART_7];
export class StartToeicReadingPracticeDto {
  @IsString() @Length(8, 128) @Matches(ID) clientSessionId!: string;
  @IsOptional() @IsIn(READING_PARTS) readingPart?: ToeicPart;
  @IsOptional() @IsEnum(ToeicDifficulty) difficulty?: ToeicDifficulty;
  @IsOptional() @IsString() @Length(1, 120) @Matches(/\S/) topic?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) questionCount = 10;
}
export class AnswerToeicReadingPracticeDto {
  @IsString() @Length(1, 191) @Matches(ID) questionId!: string;
  @IsString() @Length(1, 1) @Matches(/^[A-F]$/) selectedOption!: string;
}

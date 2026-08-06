import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ToeicPart {
  PART_1 = 'PART_1',
  PART_2 = 'PART_2',
  PART_3 = 'PART_3',
  PART_4 = 'PART_4',
  PART_5 = 'PART_5',
  PART_6 = 'PART_6',
  PART_7 = 'PART_7',
}
export enum ToeicQuestionType {
  PHOTO_DESCRIPTION = 'PHOTO_DESCRIPTION',
  QUESTION_RESPONSE = 'QUESTION_RESPONSE',
  CONVERSATION = 'CONVERSATION',
  TALK = 'TALK',
  INCOMPLETE_SENTENCE = 'INCOMPLETE_SENTENCE',
  TEXT_COMPLETION = 'TEXT_COMPLETION',
  READING_COMPREHENSION = 'READING_COMPREHENSION',
}
export enum ToeicDifficulty {
  BEGINNER = 'BEGINNER',
  ELEMENTARY = 'ELEMENTARY',
  INTERMEDIATE = 'INTERMEDIATE',
  UPPER_INTERMEDIATE = 'UPPER_INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export class ToeicQuestionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) size = 20;
  @IsOptional() @IsEnum(ToeicPart) part?: ToeicPart;
  @IsOptional() @IsEnum(ToeicQuestionType) questionType?: ToeicQuestionType;
  @IsOptional() @IsEnum(ToeicDifficulty) difficulty?: ToeicDifficulty;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() stimulusGroup?: string;
}

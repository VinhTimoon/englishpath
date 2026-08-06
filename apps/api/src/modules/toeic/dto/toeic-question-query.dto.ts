import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ToeicDifficulty,
  ToeicPart,
  ToeicQuestionType,
} from '../../../generated/prisma/enums';

export class ToeicQuestionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size = 20;

  @IsOptional()
  @IsEnum(ToeicPart)
  part?: ToeicPart;

  @IsOptional()
  @IsEnum(ToeicQuestionType)
  questionType?: ToeicQuestionType;

  @IsOptional()
  @IsEnum(ToeicDifficulty)
  difficulty?: ToeicDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stimulusGroup?: string;
}

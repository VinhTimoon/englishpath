import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VOCABULARY_LEVELS, type VocabularyLevel } from '../vocabulary.models';

const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class VocabularyFilterQueryDto {
  @IsOptional()
  @IsIn(VOCABULARY_LEVELS)
  level?: VocabularyLevel;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(identifier)
  track?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(identifier)
  skill?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  toeicPart?: number;
}

export class VocabularyTopicsQueryDto extends VocabularyFilterQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size = 20;
}

export class VocabularyMindmapQueryDto extends VocabularyFilterQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(96)
  @Matches(identifier)
  rootId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  depth = 3;
}

export class VocabularyItemsQueryDto {
  @IsString()
  @MaxLength(96)
  @Matches(identifier)
  taxonomyNodeId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size = 20;
}

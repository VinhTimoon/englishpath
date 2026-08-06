import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const SLUG = /^[a-z0-9][a-z0-9._-]{0,95}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;

export class CreateTaxonomyNodeDto {
  @Matches(SLUG)
  id!: string;

  @IsOptional()
  @Matches(SLUG)
  parentId?: string;

  @IsString()
  @Length(1, 48)
  level!: string;

  @IsString()
  @Length(1, 160)
  topic!: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  subtopic?: string;

  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(96, { each: true })
  collocations!: string[];

  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  relatedSkills!: string[];

  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  tracks!: string[];

  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  toeicParts!: number[];
}

export class CmsTaxonomyQueryDto {
  @IsOptional()
  @Matches(SLUG)
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export class CreateContentVersionDto {
  @Matches(IDENTIFIER)
  contentId!: string;

  @Matches(IDENTIFIER)
  versionId!: string;

  @Matches(IDENTIFIER)
  clientRequestId!: string;

  @IsOptional()
  @Matches(IDENTIFIER)
  previousVersionId?: string;

  @IsString()
  @Length(1, 64)
  contentType!: string;

  @IsString()
  @Length(1, 240)
  title!: string;

  @IsString()
  @Length(1, 20000)
  body!: string;

  @IsIn(['human_authored', 'imported', 'ai_assisted'])
  provenance!: string;

  @IsIn(['learning', 'assessment', 'library', 'marketing'])
  usageScope!: string;

  @IsIn(['public', 'authenticated', 'entitled'])
  accessTier!: string;

  @Matches(SLUG)
  taxonomyNodeId!: string;

  @Matches(IDENTIFIER)
  sourceId!: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  sourceUrl?: string;

  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/)
  checksum!: string;

  @IsString()
  @Length(1, 96)
  sourceVersion!: string;

  @IsString()
  @Length(1, 191)
  rightsOwner!: string;

  @IsIn(['unknown', 'blocked', 'expired', 'approved'])
  licenseStatus!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsIn(['learning', 'assessment', 'library', 'marketing'], { each: true })
  allowedUsageScopes!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(['public', 'authenticated', 'entitled'], { each: true })
  allowedAccessTiers!: string[];

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class ReviewContentVersionDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsDateString()
  reviewedAt!: string;

  @Matches(IDENTIFIER)
  contentId!: string;

  @Matches(IDENTIFIER)
  versionId!: string;

  @Matches(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/)
  checksum!: string;

  @IsString()
  @Length(1, 96)
  sourceVersion!: string;
}

export class PublishContentVersionDto {
  @Matches(IDENTIFIER)
  clientRequestId!: string;
}

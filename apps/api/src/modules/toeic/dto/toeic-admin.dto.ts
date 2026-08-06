import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ToeicAccessTier,
  ToeicDifficulty,
  ToeicLicenseStatus,
  ToeicPart,
  ToeicQuestionType,
  ToeicReviewDecision,
  ToeicUsageScope,
} from '../../../generated/prisma/enums';

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CHECKSUM = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/;

export class ToeicOptionDto {
  @Matches(/^[A-F]$/)
  id!: string;

  @IsString()
  @Length(1, 500)
  text!: string;
}

export class ToeicImportDto {
  @Matches(IDENTIFIER)
  questionId!: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @Matches(IDENTIFIER)
  previousVersionId?: string;

  @IsEnum(ToeicPart)
  part!: ToeicPart;

  @IsEnum(ToeicQuestionType)
  questionType!: ToeicQuestionType;

  @IsEnum(ToeicDifficulty)
  difficulty!: ToeicDifficulty;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stimulusGroup?: string;

  @IsString()
  @Length(1, 20_000)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ToeicOptionDto)
  options!: ToeicOptionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2_048)
  mediaReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  explanation?: string;

  @Matches(/^[A-F]$/)
  correctAnswer!: string;

  @Matches(IDENTIFIER)
  sourceIdentity!: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2_048)
  sourceUrl!: string;

  @Matches(CHECKSUM)
  checksum!: string;

  @Matches(IDENTIFIER)
  sourceVersion!: string;

  @IsString()
  @Length(1, 191)
  provenance!: string;

  @IsString()
  @Length(1, 191)
  rightsOwner!: string;

  @IsEnum(ToeicLicenseStatus)
  licenseStatus!: ToeicLicenseStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsEnum(ToeicUsageScope, { each: true })
  allowedUsageScopes!: ToeicUsageScope[];

  @IsEnum(ToeicAccessTier)
  accessTier!: ToeicAccessTier;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class ToeicReviewDto {
  @IsEnum(ToeicReviewDecision)
  decision!: ToeicReviewDecision;

  @Matches(CHECKSUM)
  checksum!: string;

  @Matches(IDENTIFIER)
  sourceVersion!: string;
}

export class ToeicPublishDto {
  @Matches(CHECKSUM)
  checksum!: string;

  @Matches(IDENTIFIER)
  sourceVersion!: string;
}

import { IsEnum, IsInt, IsString, Max, Min, Length } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const POST_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  HARMFUL_CONTENT = 'HARMFUL_CONTENT',
  COPYRIGHT = 'COPYRIGHT',
  OTHER = 'OTHER',
}
export enum Decision {
  PUBLISH = 'PUBLISH',
  REJECT = 'REJECT',
  ARCHIVE = 'ARCHIVE',
}
export class CreatePostDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 120)
  title!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 5000)
  body!: string;
}
export class CommunityPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  limit = 20;
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  offset = 0;
}
export class ReportPostDto {
  @IsEnum(ReportReason) reason!: ReportReason;
}
export class DecisionDto {
  @IsEnum(Decision) decision!: Decision;
}

export function validCommunityId(value: string) {
  return POST_ID.test(value);
}

export function validCommunityIdempotencyKey(value: string | undefined) {
  return Boolean(value && IDEMPOTENCY_KEY.test(value));
}

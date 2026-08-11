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
import {
  TOEIC_RECORDING_CONTENT_TYPES,
  type ToeicRecordingContentType,
} from '../toeic-recording.policy';

export const TOEIC_SPEAKING_RESPONSE_MODES = ['RECORDED_AUDIO'] as const;
export type ToeicSpeakingResponseMode =
  (typeof TOEIC_SPEAKING_RESPONSE_MODES)[number];

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export class SubmitToeicSpeakingDto {
  @IsEnum(TOEIC_SPEAKING_RESPONSE_MODES)
  responseMode!: ToeicSpeakingResponseMode;

  @IsOptional()
  @IsEnum(TOEIC_RECORDING_CONTENT_TYPES)
  contentType?: ToeicRecordingContentType;

  @IsInt()
  @Min(1)
  @Max(3600)
  durationSeconds!: number;

  @IsInt()
  @Min(1)
  @Max(10_000_000)
  sizeBytes!: number;

  @IsString()
  @Length(8, 128)
  @Matches(TOKEN)
  submissionReference!: string;
}

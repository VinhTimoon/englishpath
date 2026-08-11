import { IsEnum, IsString, Length, Matches } from 'class-validator';

export enum TimedTestModeDto {
  MINI = 'MINI',
  HALF = 'HALF',
  FULL = 'FULL',
}

export class StartToeicTimedTestDto {
  @IsString()
  @Length(8, 128)
  @Matches(/^\S(?:.*\S)?$/)
  clientSessionId!: string;

  @IsEnum(TimedTestModeDto)
  mode!: TimedTestModeDto;
}

export class AnswerToeicTimedTestDto {
  @IsString()
  @Length(1, 128)
  @Matches(/^\S(?:.*\S)?$/)
  questionId!: string;

  @IsString()
  @Length(1, 8)
  @Matches(/^[A-F]$/)
  selectedOption!: string;
}

import { IsEnum, IsString, IsUUID, Length } from 'class-validator';
export enum TimedTestModeDto {
  MINI = 'MINI',
  HALF = 'HALF',
}
export class StartToeicTimedTestDto {
  @IsString() @Length(8, 128) clientSessionId!: string;
  @IsEnum(TimedTestModeDto) mode!: TimedTestModeDto;
}
export class AnswerToeicTimedTestDto {
  @IsString() @Length(1, 64) questionId!: string;
  @IsString() @Length(1, 8) selectedOption!: string;
}

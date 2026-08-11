import { IsEnum, IsString, Length, Matches } from 'class-validator';
import {
  AI_EXPLANATION_SOURCES,
  type AiExplanationSource,
} from './ai-explanation.models';

const QUESTION_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class AiExplanationRequestDto {
  @IsEnum(AI_EXPLANATION_SOURCES)
  source!: AiExplanationSource;

  @IsString()
  @Length(1, 128)
  @Matches(QUESTION_REFERENCE)
  questionId!: string;
}

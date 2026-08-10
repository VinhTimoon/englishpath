import { IsEnum, IsString, Length, Matches } from 'class-validator';
import {
  AI_FEEDBACK_FEATURES,
  AI_FEEDBACK_PROMPT_VERSION,
  AI_FEEDBACK_SKILLS,
  type AiFeedbackFeature,
  type AiFeedbackSkill,
} from './ai-feedback.models';

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class AiFeedbackRequestDto {
  @IsEnum(AI_FEEDBACK_FEATURES)
  feature!: AiFeedbackFeature;

  @IsEnum(AI_FEEDBACK_SKILLS)
  skill!: AiFeedbackSkill;

  @IsString()
  @Matches(new RegExp(`^${AI_FEEDBACK_PROMPT_VERSION.replace('-', '\\-')}$`))
  promptVersion!: string;

  @IsString()
  @Length(8, 128)
  @Matches(TOKEN)
  taskId!: string;

  @IsString()
  @Length(1, 4000)
  inputText!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import {
  LEARNING_GOALS,
  LEARNING_SKILLS,
  PROFICIENCY_LEVELS,
  type LearningGoal,
  type LearningSkill,
  type ProficiencyLevel,
} from '../onboarding.models';

export class SubmitOnboardingDto {
  @ApiProperty({ enum: LEARNING_GOALS })
  @IsEnum(LEARNING_GOALS)
  primaryGoal!: LearningGoal;

  @ApiProperty({ enum: LEARNING_GOALS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(2)
  @IsEnum(LEARNING_GOALS, { each: true })
  secondaryGoals!: LearningGoal[];

  @ApiProperty({ enum: PROFICIENCY_LEVELS })
  @IsEnum(PROFICIENCY_LEVELS)
  currentLevel!: ProficiencyLevel;

  @IsInt()
  @Min(10)
  @Max(120)
  dailyMinutes!: number;

  @IsInt()
  @IsIn([30, 60, 90, 120])
  targetDays!: 30 | 60 | 90 | 120;

  @ApiProperty({ enum: LEARNING_SKILLS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsEnum(LEARNING_SKILLS, { each: true })
  prioritySkills!: LearningSkill[];
}

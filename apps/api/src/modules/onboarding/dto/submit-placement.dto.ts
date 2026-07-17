import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

class PlacementAnswerDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{0,31}$/)
  questionId!: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9-]{0,15}$/)
  optionId!: string;
}

export class SubmitPlacementDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/)
  clientSubmissionId!: string;

  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PlacementAnswerDto)
  answers!: PlacementAnswerDto[];
}

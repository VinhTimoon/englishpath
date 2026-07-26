import { IsIn, IsString, Length } from 'class-validator';

export class VocabularyReviewDto {
  @IsIn([0, 1, 2, 3])
  quality!: number;

  @IsString()
  @Length(1, 128)
  clientSubmissionId!: string;
}

export class VocabularyDueQueryDto {
  @IsIn([1, 2, 3, 4, 5, 10, 20, 50])
  limit = 20;
}

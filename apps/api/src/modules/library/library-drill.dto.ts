import { IsIn, IsString, MaxLength } from 'class-validator';
export class LibraryDrillAnswerDto { @IsString() @MaxLength(100) questionId!: string; @IsString() @MaxLength(100) @IsIn(['option-a','option-b','option-c','option-d']) selectedOptionId!: string; }

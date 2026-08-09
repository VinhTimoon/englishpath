import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
export class LibraryProgressDto { @IsIn(['not_started','in_progress','completed','abandoned']) status!: string; @IsInt() @Min(0) @Max(86400) positionSeconds!: number; }
export class LibraryBookmarkDto { @IsInt() @Min(0) @Max(86400) timestampSeconds!: number; }
export class LibraryNoteDto { @IsString() @MaxLength(5000) body!: string; }

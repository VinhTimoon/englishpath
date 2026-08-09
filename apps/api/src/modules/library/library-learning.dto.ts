import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { LibraryItemParamsDto } from './library-catalogue.dto';
export class LibraryProgressDto {
  @IsIn(['not_started', 'in_progress', 'completed', 'abandoned'])
  status!: string;
  @IsInt() @Min(0) @Max(86400) positionSeconds!: number;
}
export class LibraryBookmarkDto {
  @IsInt() @Min(0) @Max(86400) timestampSeconds!: number;
}
export class LibraryNoteDto {
  @IsString() @MaxLength(5000) body!: string;
}
export class LibraryBookmarkParamsDto extends LibraryItemParamsDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(86400) timestampSeconds!: number;
}

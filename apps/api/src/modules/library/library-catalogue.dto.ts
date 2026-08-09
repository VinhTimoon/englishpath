import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LibraryCatalogueQueryDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(50) size = 12;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() contentType?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://cdn.example/avatar.png',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^https:\/\//)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'vi-VN' })
  @IsOptional()
  @Matches(/^[a-z]{2}(?:-[A-Z]{2})?$/)
  locale?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsOptional()
  @Matches(/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/)
  timezone?: string;
}

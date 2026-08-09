import { ApiProperty } from '@nestjs/swagger';

export const LIBRARY_LINK_KINDS = ['roadmap', 'vocabulary', 'quiz'] as const;
export type LibraryLinkKind = (typeof LIBRARY_LINK_KINDS)[number];

export class LibraryLinkDto {
  @ApiProperty({ enum: LIBRARY_LINK_KINDS })
  kind!: LibraryLinkKind;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty({ required: false })
  completed?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  ROADMAP_ITEM_STATUSES,
  type RoadmapItemStatus,
} from '../roadmap.models';

export class UpdateRoadmapItemDto {
  @ApiProperty({ enum: ROADMAP_ITEM_STATUSES })
  @IsIn(ROADMAP_ITEM_STATUSES)
  status!: RoadmapItemStatus;
}

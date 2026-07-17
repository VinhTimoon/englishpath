import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoadmapController } from './roadmap.controller';
import { ROADMAP_REPOSITORY } from './roadmap.models';
import { PrismaRoadmapRepository } from './prisma-roadmap.repository';
import { RoadmapService } from './roadmap.service';

@Module({
  imports: [AuthModule],
  controllers: [RoadmapController],
  providers: [
    RoadmapService,
    PrismaRoadmapRepository,
    { provide: ROADMAP_REPOSITORY, useExisting: PrismaRoadmapRepository },
  ],
})
export class RoadmapModule {}

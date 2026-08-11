import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoadmapController } from './roadmap.controller';
import { ROADMAP_REPOSITORY } from './roadmap.models';
import { PrismaRoadmapRepository } from './prisma-roadmap.repository';
import { RoadmapService } from './roadmap.service';
import { PracticeModule } from '../practice/practice.module';

@Module({
  imports: [AuthModule, PracticeModule],
  controllers: [RoadmapController],
  providers: [
    RoadmapService,
    PrismaRoadmapRepository,
    { provide: ROADMAP_REPOSITORY, useExisting: PrismaRoadmapRepository },
  ],
})
export class RoadmapModule {}

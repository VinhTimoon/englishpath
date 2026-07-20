import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DailySentenceController } from './daily-sentence.controller';
import { DAILY_SENTENCE_REPOSITORY } from './daily-sentence.models';
import { DailySentenceService } from './daily-sentence.service';
import { PrismaDailySentenceRepository } from './prisma-daily-sentence.repository';
@Module({
  imports: [AuthModule],
  controllers: [DailySentenceController],
  providers: [
    DailySentenceService,
    PrismaDailySentenceRepository,
    {
      provide: DAILY_SENTENCE_REPOSITORY,
      useExisting: PrismaDailySentenceRepository,
    },
  ],
})
export class DailySentenceModule {}

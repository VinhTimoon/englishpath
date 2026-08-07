import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PracticeController } from './practice.controller';
import { PRACTICE_REPOSITORY } from './practice.models';
import { PracticeService } from './practice.service';
import { PrismaPracticeRepository } from './prisma-practice.repository';
import { TOEIC_ERROR_NOTEBOOK_CAPTURE } from './practice.models';

@Module({
  imports: [AuthModule],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    PrismaPracticeRepository,
    { provide: PRACTICE_REPOSITORY, useExisting: PrismaPracticeRepository },
    {
      provide: TOEIC_ERROR_NOTEBOOK_CAPTURE,
      useExisting: PrismaPracticeRepository,
    },
  ],
  exports: [TOEIC_ERROR_NOTEBOOK_CAPTURE],
})
export class PracticeModule {}

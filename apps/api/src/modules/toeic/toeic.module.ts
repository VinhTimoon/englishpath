import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaToeicAdminRepository } from './toeic-admin.repository';
import { TOEIC_ADMIN_REPOSITORY } from './toeic-admin.models';
import { ToeicAdminService } from './toeic-admin.service';
import { PrismaToeicQuestionRepository } from './toeic-question.repository';
import { ToeicController } from './toeic.controller';
import { TOEIC_QUESTION_REPOSITORY } from './toeic-question.models';
import { ToeicQuestionService } from './toeic-question.service';
import { TOEIC_LISTENING_PRACTICE_REPOSITORY } from './toeic-listening-practice.models';
import { PrismaToeicListeningPracticeRepository } from './toeic-listening-practice.repository';
import { ToeicListeningPracticeService } from './toeic-listening-practice.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ToeicController],
  providers: [
    ToeicQuestionService,
    ToeicListeningPracticeService,
    PrismaToeicListeningPracticeRepository,
    ToeicAdminService,
    PrismaToeicQuestionRepository,
    PrismaToeicAdminRepository,
    {
      provide: TOEIC_ADMIN_REPOSITORY,
      useExisting: PrismaToeicAdminRepository,
    },
    {
      provide: TOEIC_QUESTION_REPOSITORY,
      useExisting: PrismaToeicQuestionRepository,
    },
    {
      provide: TOEIC_LISTENING_PRACTICE_REPOSITORY,
      useExisting: PrismaToeicListeningPracticeRepository,
    },
  ],
})
export class ToeicModule {}

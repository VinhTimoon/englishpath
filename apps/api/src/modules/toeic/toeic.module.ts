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

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ToeicController],
  providers: [
    ToeicQuestionService,
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
  ],
})
export class ToeicModule {}

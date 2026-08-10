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
import { PrismaToeicReadingPracticeRepository } from './toeic-reading-practice.repository';
import { TOEIC_READING_PRACTICE_REPOSITORY } from './toeic-reading-practice.models';
import { ToeicReadingPracticeService } from './toeic-reading-practice.service';
import { PrismaToeicPracticeCatalogueRepository } from './toeic-practice-catalogue.repository';
import { TOEIC_PRACTICE_CATALOGUE_REPOSITORY } from './toeic-practice-catalogue.models';
import { ToeicPracticeCatalogueService } from './toeic-practice-catalogue.service';
import { ToeicTimedTestService } from './toeic-timed-test.service';
import { PrismaToeicTimedTestRepository } from './toeic-timed-test.repository';
import {
  TOEIC_TIMED_TEST_CLOCK,
  TOEIC_TIMED_TEST_REPOSITORY,
} from './toeic-timed-test.models';
import { PracticeModule } from '../practice/practice.module';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { ToeicSpeakingSubmissionService } from './toeic-speaking-submission.service';
import { PrismaToeicSpeakingSubmissionRepository } from './toeic-speaking-submission.repository';
import { EnglishPathSpeakingTaskCatalogue } from './toeic-speaking-task.catalogue';
import {
  TOEIC_SPEAKING_SUBMISSION_REPOSITORY,
  TOEIC_SPEAKING_TASK_CATALOGUE,
} from './toeic-speaking-submission.models';
import { ToeicWritingSubmissionService } from './toeic-writing-submission.service';
import { PrismaToeicWritingSubmissionRepository } from './toeic-writing-submission.repository';
import { EnglishPathWritingTaskCatalogue } from './toeic-writing-task.catalogue';
import {
  TOEIC_WRITING_SUBMISSION_REPOSITORY,
  TOEIC_WRITING_TASK_CATALOGUE,
} from './toeic-writing-submission.models';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    PracticeModule,
    VocabularyModule,
    AiGatewayModule,
  ],
  controllers: [ToeicController],
  providers: [
    ToeicQuestionService,
    ToeicListeningPracticeService,
    ToeicReadingPracticeService,
    ToeicPracticeCatalogueService,
    ToeicTimedTestService,
    ToeicSpeakingSubmissionService,
    PrismaToeicSpeakingSubmissionRepository,
    EnglishPathSpeakingTaskCatalogue,
    ToeicWritingSubmissionService,
    PrismaToeicWritingSubmissionRepository,
    EnglishPathWritingTaskCatalogue,
    {
      provide: TOEIC_SPEAKING_SUBMISSION_REPOSITORY,
      useExisting: PrismaToeicSpeakingSubmissionRepository,
    },
    {
      provide: TOEIC_SPEAKING_TASK_CATALOGUE,
      useExisting: EnglishPathSpeakingTaskCatalogue,
    },
    {
      provide: TOEIC_WRITING_SUBMISSION_REPOSITORY,
      useExisting: PrismaToeicWritingSubmissionRepository,
    },
    {
      provide: TOEIC_WRITING_TASK_CATALOGUE,
      useExisting: EnglishPathWritingTaskCatalogue,
    },
    PrismaToeicTimedTestRepository,
    {
      provide: TOEIC_TIMED_TEST_REPOSITORY,
      useExisting: PrismaToeicTimedTestRepository,
    },
    {
      provide: TOEIC_TIMED_TEST_CLOCK,
      useFactory: () => () => new Date(),
    },
    PrismaToeicPracticeCatalogueRepository,
    {
      provide: TOEIC_PRACTICE_CATALOGUE_REPOSITORY,
      useExisting: PrismaToeicPracticeCatalogueRepository,
    },
    PrismaToeicReadingPracticeRepository,
    {
      provide: TOEIC_READING_PRACTICE_REPOSITORY,
      useExisting: PrismaToeicReadingPracticeRepository,
    },
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

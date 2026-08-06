import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaToeicQuestionRepository } from './toeic-question.repository';
import { ToeicController } from './toeic.controller';
import { TOEIC_QUESTION_REPOSITORY } from './toeic-question.models';
import { ToeicQuestionService } from './toeic-question.service';
@Module({
  imports: [AuthModule],
  controllers: [ToeicController],
  providers: [
    ToeicQuestionService,
    PrismaToeicQuestionRepository,
    {
      provide: TOEIC_QUESTION_REPOSITORY,
      useExisting: PrismaToeicQuestionRepository,
    },
  ],
})
export class ToeicModule {}

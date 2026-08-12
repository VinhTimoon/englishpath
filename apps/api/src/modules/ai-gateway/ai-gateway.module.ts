import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PracticeModule } from '../practice/practice.module';
import { AiGatewayController } from './ai-gateway.controller';
import {
  AI_FEEDBACK_ADAPTER,
  AI_FEEDBACK_USAGE_REPOSITORY,
} from './ai-feedback.models';
import { AiFeedbackGatewayService } from './ai-feedback.service';
import { PrismaAiFeedbackUsageRepository } from './ai-feedback.repository';
import { LocalNoopFeedbackAdapter } from './local-noop-feedback.adapter';
import { AiExplanationGatewayService } from './ai-explanation.service';

@Module({
  imports: [AuthModule, PracticeModule],
  controllers: [AiGatewayController],
  providers: [
    AiFeedbackGatewayService,
    AiExplanationGatewayService,
    PrismaAiFeedbackUsageRepository,
    LocalNoopFeedbackAdapter,
    {
      provide: AI_FEEDBACK_USAGE_REPOSITORY,
      useExisting: PrismaAiFeedbackUsageRepository,
    },
    {
      provide: AI_FEEDBACK_ADAPTER,
      useExisting: LocalNoopFeedbackAdapter,
    },
  ],
  exports: [AiFeedbackGatewayService, AI_FEEDBACK_USAGE_REPOSITORY],
})
export class AiGatewayModule {}

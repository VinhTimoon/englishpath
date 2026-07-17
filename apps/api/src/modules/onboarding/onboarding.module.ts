import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OnboardingController } from './onboarding.controller';
import { ONBOARDING_REPOSITORY } from './onboarding.models';
import { OnboardingService } from './onboarding.service';
import { PrismaOnboardingRepository } from './prisma-onboarding.repository';

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    PrismaOnboardingRepository,
    { provide: ONBOARDING_REPOSITORY, useExisting: PrismaOnboardingRepository },
  ],
  exports: [ONBOARDING_REPOSITORY],
})
export class OnboardingModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { PracticeModule } from './modules/practice/practice.module';
import { DailySentenceModule } from './modules/daily-sentence/daily-sentence.module';
import { AdminModule } from './modules/admin/admin.module';
import { CmsModule } from './modules/cms/cms.module';
import { ToeicModule } from './modules/toeic/toeic.module';
import { LibraryModule } from './modules/library/library.module';
import { CommunityModule } from './modules/community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    HealthModule,
    PrismaModule,
    VocabularyModule,
    AuthModule,
    OnboardingModule,
    RoadmapModule,
    PracticeModule,
    DailySentenceModule,
    AdminModule,
    CmsModule,
    ToeicModule,
    LibraryModule,
    CommunityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

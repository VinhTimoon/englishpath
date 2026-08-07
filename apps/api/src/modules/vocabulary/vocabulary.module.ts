import { Module } from '@nestjs/common';
import { LocalVocabularyRepository } from './local-vocabulary.repository';
import { PrismaVocabularyItemRepository } from './prisma-vocabulary-item.repository';
import { VocabularyController } from './vocabulary.controller';
import {
  VOCABULARY_ITEM_REPOSITORY,
  VOCABULARY_REPOSITORY,
  VOCABULARY_SRS_REPOSITORY,
} from './vocabulary.models';
import { VocabularyService } from './vocabulary.service';
import { VocabularySrsRepository } from './vocabulary-srs.repository';
import { VocabularySrsService } from './vocabulary-srs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VocabularyController],
  providers: [
    VocabularyService,
    VocabularySrsService,
    VocabularySrsRepository,
    {
      provide: VOCABULARY_SRS_REPOSITORY,
      useExisting: VocabularySrsRepository,
    },
    LocalVocabularyRepository,
    PrismaVocabularyItemRepository,
    {
      provide: VOCABULARY_REPOSITORY,
      useExisting: LocalVocabularyRepository,
    },
    {
      provide: VOCABULARY_ITEM_REPOSITORY,
      useExisting: PrismaVocabularyItemRepository,
    },
  ],
  exports: [VocabularyService],
})
export class VocabularyModule {}

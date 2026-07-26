import { Module } from '@nestjs/common';
import { LocalVocabularyRepository } from './local-vocabulary.repository';
import { PrismaVocabularyItemRepository } from './prisma-vocabulary-item.repository';
import { VocabularyController } from './vocabulary.controller';
import {
  VOCABULARY_ITEM_REPOSITORY,
  VOCABULARY_REPOSITORY,
} from './vocabulary.models';
import { VocabularyService } from './vocabulary.service';

@Module({
  controllers: [VocabularyController],
  providers: [
    VocabularyService,
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
})
export class VocabularyModule {}

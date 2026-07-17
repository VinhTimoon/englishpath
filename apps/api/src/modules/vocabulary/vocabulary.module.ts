import { Module } from '@nestjs/common';
import { LocalVocabularyRepository } from './local-vocabulary.repository';
import { VocabularyController } from './vocabulary.controller';
import { VOCABULARY_REPOSITORY } from './vocabulary.models';
import { VocabularyService } from './vocabulary.service';

@Module({
  controllers: [VocabularyController],
  providers: [
    VocabularyService,
    LocalVocabularyRepository,
    {
      provide: VOCABULARY_REPOSITORY,
      useExisting: LocalVocabularyRepository,
    },
  ],
})
export class VocabularyModule {}

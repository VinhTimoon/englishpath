import { Injectable } from '@nestjs/common';
import { VOCABULARY_FIXTURE } from './vocabulary.fixture';
import type {
  VocabularyRepository,
  VocabularySnapshot,
} from './vocabulary.models';

@Injectable()
export class LocalVocabularyRepository implements VocabularyRepository {
  loadSnapshot(): Promise<VocabularySnapshot> {
    return Promise.resolve(VOCABULARY_FIXTURE);
  }
}

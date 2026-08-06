import { Inject, Injectable } from '@nestjs/common';
import {
  TOEIC_PRACTICE_CATALOGUE_REPOSITORY,
  type ToeicPracticeCatalogueRepository,
} from './toeic-practice-catalogue.models';

@Injectable()
export class ToeicPracticeCatalogueService {
  constructor(
    @Inject(TOEIC_PRACTICE_CATALOGUE_REPOSITORY)
    private readonly repository: ToeicPracticeCatalogueRepository,
  ) {}

  getCatalogue() {
    return this.repository.catalogue(new Date());
  }
}

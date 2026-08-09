import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LibraryCatalogueController } from './library-catalogue.controller';
import {
  LIBRARY_CATALOGUE_PORT,
  LocalLibraryCatalogueAdapter,
} from './library-catalogue.port';
import { LibraryCatalogueService } from './library-catalogue.service';
import { LibraryLinksService } from './library-links.service';
import { LibraryLearningService } from './library-learning.service';
import { LibraryLearningRepository } from './library-learning.repository';
import { LIBRARY_LEARNING_REPOSITORY } from './library-learning.port';
import {
  CONTROLLED_MEDIA_PORT,
  LocalControlledMediaAdapter,
} from './library-content.ports';
import {
  LIBRARY_DRILL_PORT,
  LocalLibraryDrillAdapter,
} from './library-drill.port';

@Module({
  imports: [AuthModule],
  controllers: [LibraryCatalogueController],
  providers: [
    LibraryCatalogueService,
    LibraryLinksService,
    LibraryLearningService,
    LibraryLearningRepository,
    {
      provide: LIBRARY_LEARNING_REPOSITORY,
      useExisting: LibraryLearningRepository,
    },
    LocalLibraryCatalogueAdapter,
    LocalControlledMediaAdapter,
    {
      provide: LIBRARY_CATALOGUE_PORT,
      useExisting: LocalLibraryCatalogueAdapter,
    },
    {
      provide: CONTROLLED_MEDIA_PORT,
      useExisting: LocalControlledMediaAdapter,
    },
    LocalLibraryDrillAdapter,
    { provide: LIBRARY_DRILL_PORT, useExisting: LocalLibraryDrillAdapter },
  ],
})
export class LibraryModule {}

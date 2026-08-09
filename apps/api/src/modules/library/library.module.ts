import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LibraryCatalogueController } from './library-catalogue.controller';
import {
  LIBRARY_CATALOGUE_PORT,
  LocalLibraryCatalogueAdapter,
} from './library-catalogue.port';
import { LibraryCatalogueService } from './library-catalogue.service';
import {
  CONTROLLED_MEDIA_PORT,
  LocalControlledMediaAdapter,
} from './library-content.ports';

@Module({
  imports: [AuthModule],
  controllers: [LibraryCatalogueController],
  providers: [
    LibraryCatalogueService,
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
  ],
})
export class LibraryModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LibraryCatalogueController } from './library-catalogue.controller';
import {
  LIBRARY_CATALOGUE_PORT,
  LocalLibraryCatalogueAdapter,
} from './library-catalogue.port';
import { LibraryCatalogueService } from './library-catalogue.service';

@Module({
  imports: [AuthModule],
  controllers: [LibraryCatalogueController],
  providers: [
    LibraryCatalogueService,
    LocalLibraryCatalogueAdapter,
    {
      provide: LIBRARY_CATALOGUE_PORT,
      useExisting: LocalLibraryCatalogueAdapter,
    },
  ],
})
export class LibraryModule {}

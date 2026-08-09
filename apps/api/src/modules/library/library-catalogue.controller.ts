import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/auth.guards';
import { LibraryCatalogueQueryDto } from './library-catalogue.dto';
import { LibraryCatalogueService } from './library-catalogue.service';

@ApiTags('library')
@ApiBearerAuth()
@Controller('api/v1/library')
@UseGuards(AuthenticationGuard)
export class LibraryCatalogueController {
  constructor(private readonly service: LibraryCatalogueService) {}
  @Get('catalogue') getCatalogue(@Query() query: LibraryCatalogueQueryDto) {
    return this.service.query(query);
  }
}

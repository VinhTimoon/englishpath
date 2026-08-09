import {
  Controller,
  Get,
  Headers,
  Query,
  Param,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/auth.guards';
import { authCorrelationId } from '../auth/auth-exception.filter';
import {
  LibraryCatalogueQueryDto,
  LibraryItemParamsDto,
} from './library-catalogue.dto';
import { LibraryCatalogueExceptionFilter } from './library-catalogue-exception.filter';
import { LibraryCatalogueService } from './library-catalogue.service';

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('library')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Correlation-Id',
  required: false,
  description: 'Validated correlation ID; generated when omitted.',
})
@Controller('api/v1/library')
@UseGuards(AuthenticationGuard)
@UseFilters(LibraryCatalogueExceptionFilter)
export class LibraryCatalogueController {
  constructor(private readonly service: LibraryCatalogueService) {}

  @Get('catalogue')
  @UsePipes(strictValidation)
  @ApiOperation({ summary: 'List the authenticated learner library catalogue' })
  @ApiOkResponse({ description: 'Safe, governed library catalogue projection' })
  @ApiBadRequestResponse({ description: 'Invalid catalogue query' })
  async getCatalogue(
    @Query() query: LibraryCatalogueQueryDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.service.query(query),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Get('items/:versionId')
  @UsePipes(strictValidation)
  @ApiOperation({ summary: 'Get an eligible learner-safe library item' })
  @ApiOkResponse({
    description: 'Safe transcript and controlled media projection',
  })
  @ApiNotFoundResponse({ description: 'Library item is not available' })
  async getItem(
    @Param() params: LibraryItemParamsDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.service.getItem(params.versionId),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }
}

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
  Body,
  Delete,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request';
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
import { LibraryLearningService } from './library-learning.service';
import { LibraryDrillAnswerDto } from './library-drill.dto';
import {
  LibraryProgressDto,
  LibraryBookmarkDto,
  LibraryNoteDto,
  LibraryBookmarkParamsDto,
} from './library-learning.dto';

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
  constructor(
    private readonly service: LibraryCatalogueService,
    private readonly learning: LibraryLearningService,
  ) {}

  @Get('items/:versionId/state')
  @UsePipes(strictValidation)
  async getState(
    @Param() params: LibraryItemParamsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.state(
        req.principal!.applicationUserId,
        params.versionId,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Put('items/:versionId/progress')
  @UsePipes(strictValidation)
  async saveProgress(
    @Param() params: LibraryItemParamsDto,
    @Body() body: LibraryProgressDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.saveProgress(
        req.principal!.applicationUserId,
        params.versionId,
        body,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_upsert',
      },
    };
  }

  @Post('items/:versionId/bookmarks')
  @UsePipes(strictValidation)
  async addBookmark(
    @Param() params: LibraryItemParamsDto,
    @Body() body: LibraryBookmarkDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.addBookmark(
        req.principal!.applicationUserId,
        params.versionId,
        body,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_upsert',
      },
    };
  }

  @Delete('items/:versionId/bookmarks/:timestampSeconds')
  async deleteBookmark(
    @Param() params: LibraryBookmarkParamsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.deleteBookmark(
        req.principal!.applicationUserId,
        params.versionId,
        params.timestampSeconds,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_delete',
      },
    };
  }

  @Put('items/:versionId/note')
  @UsePipes(strictValidation)
  async saveNote(
    @Param() params: LibraryItemParamsDto,
    @Body() body: LibraryNoteDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.saveNote(
        req.principal!.applicationUserId,
        params.versionId,
        body,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_upsert',
      },
    };
  }

  @Delete('items/:versionId/note')
  async deleteNote(
    @Param() params: LibraryItemParamsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.deleteNote(
        req.principal!.applicationUserId,
        params.versionId,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_delete',
      },
    };
  }

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

  @Get('items/:versionId/drill')
  async getDrill(
    @Param() params: LibraryItemParamsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.getDrill(
        req.principal!.applicationUserId,
        params.versionId,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Post('items/:versionId/drill/submit')
  @UsePipes(strictValidation)
  async submitDrill(
    @Param() params: LibraryItemParamsDto,
    @Body() body: LibraryDrillAnswerDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.submitDrill(
        req.principal!.applicationUserId,
        params.versionId,
        body,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'idempotent_replay',
      },
    };
  }

  @Get('items/:versionId/drill/history')
  async drillHistory(
    @Param() params: LibraryItemParamsDto,
    @Req() req: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.learning.drillHistory(
        req.principal!.applicationUserId,
        params.versionId,
      ),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }
}

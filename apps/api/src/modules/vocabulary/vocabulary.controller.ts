import {
  Controller,
  Get,
  Headers,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Body, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AuthenticationGuard } from '../auth/auth.guards';
import { authCorrelationId } from '../auth/auth-exception.filter';
import {
  VocabularyDueQueryDto,
  VocabularyReviewDto,
} from './dto/vocabulary-review.dto';
import { VocabularySrsService } from './vocabulary-srs.service';
import {
  VocabularyMindmapQueryDto,
  VocabularyItemsQueryDto,
  VocabularyTopicsQueryDto,
} from './dto/vocabulary-query.dto';
import {
  VocabularyExceptionFilter,
  vocabularyCorrelationId,
} from './vocabulary-exception.filter';
import { VocabularyService } from './vocabulary.service';

const queryValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('vocabulary')
@Controller('api/v1/vocabulary')
@UseFilters(VocabularyExceptionFilter)
export class VocabularyController {
  constructor(
    private readonly service: VocabularyService,
    private readonly srsService: VocabularySrsService,
  ) {}

  @Get('reviews/due')
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @UsePipes(queryValidation)
  @ApiOperation({
    summary: 'List the authenticated learner vocabulary review queue',
  })
  @ApiOkResponse({
    description: 'Due vocabulary reviews ordered by schedule and item ID',
  })
  async dueReviews(
    @Req() request: AuthenticatedRequest,
    @Query() query: VocabularyDueQueryDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return {
      data: await this.srsService.due(request.principal!, query.limit),
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Post('reviews/:vocabularyId')
  @ApiBearerAuth()
  @UseGuards(AuthenticationGuard)
  @UsePipes(queryValidation)
  @ApiOperation({ summary: 'Submit recall quality for a vocabulary item' })
  @ApiOkResponse({
    description: 'Server-calculated mastery and scheduling result',
  })
  async review(
    @Req() request: AuthenticatedRequest,
    @Param('vocabularyId') vocabularyId: string,
    @Body() input: VocabularyReviewDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const result = await this.srsService.review(
      request.principal!,
      vocabularyId,
      input.quality,
      input.clientSubmissionId,
    );
    return {
      data: result.data,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: result.idempotencyStatus,
      },
    };
  }

  @Get('topics')
  @UsePipes(queryValidation)
  @ApiOperation({ summary: 'List published vocabulary taxonomy topics' })
  @ApiOkResponse({ description: 'Paginated public topic summaries' })
  @ApiBadRequestResponse({ description: 'Invalid filters or pagination' })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized adapter or internal taxonomy failure',
  })
  async listTopics(
    @Query() query: VocabularyTopicsQueryDto,
    @Headers('x-correlation-id') correlationHeader?: string,
  ) {
    const result = await this.service.listTopics(query);
    return {
      ...result,
      meta: {
        correlationId: vocabularyCorrelationId(correlationHeader),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Get('items')
  @UsePipes(queryValidation)
  @ApiOperation({
    summary: 'List published vocabulary items for a taxonomy node',
  })
  @ApiOkResponse({
    description:
      'Paginated public vocabulary items without governance metadata',
  })
  @ApiBadRequestResponse({ description: 'Invalid taxonomy node or pagination' })
  @ApiNotFoundResponse({ description: 'Requested taxonomy node is not public' })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized persistence or internal failure',
  })
  async listItems(
    @Query() query: VocabularyItemsQueryDto,
    @Headers('x-correlation-id') correlationHeader?: string,
  ) {
    const result = await this.service.listItems(query);
    return {
      ...result,
      meta: {
        correlationId: vocabularyCorrelationId(correlationHeader),
        idempotencyStatus: 'not_applicable',
      },
    };
  }

  @Get('mindmap')
  @UsePipes(queryValidation)
  @ApiOperation({ summary: 'Read the published vocabulary taxonomy mindmap' })
  @ApiOkResponse({ description: 'Bounded public vocabulary mindmap' })
  @ApiBadRequestResponse({ description: 'Invalid filters or depth' })
  @ApiNotFoundResponse({ description: 'Requested root does not exist' })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized adapter or internal taxonomy failure',
  })
  async getMindmap(
    @Query() query: VocabularyMindmapQueryDto,
    @Headers('x-correlation-id') correlationHeader?: string,
  ) {
    const result = await this.service.getMindmap(query);
    return {
      ...result,
      meta: {
        correlationId: vocabularyCorrelationId(correlationHeader),
        idempotencyStatus: 'not_applicable',
      },
    };
  }
}

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
} from '@nestjs/swagger';
import {
  VocabularyMindmapQueryDto,
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
  constructor(private readonly service: VocabularyService) {}

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

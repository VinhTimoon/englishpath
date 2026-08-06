import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/auth.guards';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { ToeicExceptionFilter } from './toeic-exception.filter';
import { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';
import { ToeicQuestionService } from './toeic-question.service';

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('toeic')
@ApiBearerAuth()
@Controller('api/v1/toeic')
@UseGuards(AuthenticationGuard)
@UseFilters(ToeicExceptionFilter)
export class ToeicController {
  constructor(private readonly service: ToeicQuestionService) {}

  @Get('questions')
  @UsePipes(strictValidation)
  @ApiOperation({ summary: 'List eligible learner TOEIC questions' })
  @ApiOkResponse({ description: 'Paginated answer-redacted questions' })
  @ApiBadRequestResponse({ description: 'Invalid query or correlation ID' })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized repository failure',
  })
  list(
    @Query() query: ToeicQuestionQueryDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.service.list(query).then((result) => ({
      ...result,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    }));
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'Read one current eligible learner TOEIC question' })
  @ApiOkResponse({ description: 'Answer-redacted question' })
  @ApiNotFoundResponse({ description: 'Question is unknown or not eligible' })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized repository failure',
  })
  get(
    @Param('id') questionId: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.service.get(questionId).then((result) => ({
      ...result,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    }));
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { authCorrelationId } from '../auth/auth-exception.filter';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AuthenticationGuard } from '../auth/auth.guards';
import { ToeicExceptionFilter } from './toeic-exception.filter';
import { ToeicAdminService } from './toeic-admin.service';
import {
  ToeicImportDto,
  ToeicPublishDto,
  ToeicReviewDto,
} from './dto/toeic-admin.dto';
import { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';
import { ToeicQuestionService } from './toeic-question.service';
import { ToeicListeningPracticeService } from './toeic-listening-practice.service';
import {
  AnswerToeicListeningPracticeDto,
  StartToeicListeningPracticeDto,
} from './dto/toeic-listening-practice.dto';
import { ToeicReadingPracticeService } from './toeic-reading-practice.service';
import { ToeicPracticeCatalogueService } from './toeic-practice-catalogue.service';
import {
  AnswerToeicReadingPracticeDto,
  StartToeicReadingPracticeDto,
} from './dto/toeic-reading-practice.dto';

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('toeic')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Correlation-Id',
  required: false,
  description: 'Validated correlation ID; generated when omitted.',
})
@Controller('api/v1/toeic')
@UseGuards(AuthenticationGuard)
@UseFilters(ToeicExceptionFilter)
export class ToeicController {
  constructor(
    private readonly service: ToeicQuestionService,
    private readonly adminService: ToeicAdminService,
    private readonly listening: ToeicListeningPracticeService,
    private readonly reading: ToeicReadingPracticeService,
    private readonly catalogue: ToeicPracticeCatalogueService,
  ) {}

  @Get('practice/catalogue')
  @ApiOperation({
    summary: 'Read the authenticated learner TOEIC practice catalogue',
  })
  @ApiOkResponse({ description: 'Governed practice filter options.' })
  catalogueOptions(@Headers('x-correlation-id') correlation?: string) {
    const correlationId = authCorrelationId(correlation);
    return this.catalogue.getCatalogue().then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Post('practice/reading/sessions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({
    summary: 'Start or replay an authenticated TOEIC reading practice session',
  })
  @ApiOkResponse({
    description: 'Safe reading questions and session projection.',
  })
  @ApiBadRequestResponse({ description: 'Invalid reading practice request.' })
  @ApiConflictResponse({
    description: 'The client session key conflicts with an existing session.',
  })
  @ApiNotFoundResponse({
    description: 'There is not enough eligible reading content.',
  })
  startReading(
    @Body() input: StartToeicReadingPracticeDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.reading.start(request.principal!, input).then((data) => ({
      data,
      meta: {
        correlationId,
        idempotencyStatus: data.replayed ? 'replayed' : 'created',
      },
    }));
  }

  @Post('practice/reading/sessions/:sessionId/answers')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({
    summary: 'Record one immutable answer in a reading practice session',
  })
  @ApiOkResponse({
    description: 'Safe answer acknowledgement without correctness.',
  })
  @ApiNotFoundResponse({
    description: 'The session or question is unavailable.',
  })
  @ApiConflictResponse({
    description: 'The answer conflicts with a prior submission.',
  })
  answerReading(
    @Param('sessionId') sessionId: string,
    @Body() input: AnswerToeicReadingPracticeDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.reading
      .answer(request.principal!, sessionId, input)
      .then((data) => ({
        data,
        meta: {
          correlationId,
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('practice/reading/sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a completed reading practice session' })
  @ApiOkResponse({ description: 'Final reading score projection.' })
  @ApiNotFoundResponse({ description: 'The session is unavailable.' })
  @ApiConflictResponse({
    description: 'The session was submitted concurrently.',
  })
  @ApiUnprocessableEntityResponse({ description: 'The session is incomplete.' })
  submitReading(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.reading.submit(request.principal!, sessionId).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Get('practice/reading/sessions/:sessionId/result')
  @ApiOperation({
    summary: 'Read the authenticated learner reading practice result',
  })
  @ApiOkResponse({
    description: 'Safe active or submitted reading projection.',
  })
  @ApiNotFoundResponse({ description: 'The session is unavailable.' })
  readingResult(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.reading.result(request.principal!, sessionId).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Post('practice/listening/sessions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({
    summary:
      'Start or replay an authenticated TOEIC listening practice session',
  })
  @ApiOkResponse({
    description: 'Safe listening questions and session projection.',
  })
  @ApiBadRequestResponse({ description: 'Invalid practice request.' })
  @ApiConflictResponse({
    description: 'The client session key conflicts with an existing session.',
  })
  @ApiNotFoundResponse({
    description: 'There is not enough eligible listening content.',
  })
  startListening(
    @Body() input: StartToeicListeningPracticeDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.listening.start(request.principal!, input).then((data) => ({
      data,
      meta: {
        correlationId,
        idempotencyStatus: data.replayed ? 'replayed' : 'created',
      },
    }));
  }

  @Post('practice/listening/sessions/:sessionId/answers')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({
    summary: 'Record one immutable answer in a listening practice session',
  })
  @ApiOkResponse({
    description: 'Safe answer acknowledgement without correctness.',
  })
  @ApiNotFoundResponse({
    description: 'The session or question is unavailable.',
  })
  @ApiConflictResponse({
    description: 'The answer conflicts with a prior submission.',
  })
  answerListening(
    @Param('sessionId') sessionId: string,
    @Body() input: AnswerToeicListeningPracticeDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.listening
      .answer(request.principal!, sessionId, input)
      .then((data) => ({
        data,
        meta: {
          correlationId,
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('practice/listening/sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a completed listening practice session' })
  @ApiOkResponse({ description: 'Final score projection.' })
  @ApiNotFoundResponse({ description: 'The session is unavailable.' })
  @ApiConflictResponse({
    description: 'The session was submitted concurrently.',
  })
  @ApiUnprocessableEntityResponse({ description: 'The session is incomplete.' })
  submitListening(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.listening
      .submit(request.principal!, sessionId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Get('practice/listening/sessions/:sessionId/result')
  @ApiOperation({
    summary: 'Read the authenticated learner listening practice result',
  })
  @ApiOkResponse({
    description: 'Safe active or submitted session projection.',
  })
  @ApiNotFoundResponse({ description: 'The session is unavailable.' })
  listeningResult(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.listening
      .result(request.principal!, sessionId)
      .then((data) => ({
        data,
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      }));
  }

  @Post('admin/question-versions/import')
  @UsePipes(strictValidation)
  @ApiBody({ type: ToeicImportDto })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Actor-bound key for safe import retries.',
  })
  @ApiOperation({ summary: 'Import an immutable TOEIC question draft' })
  @ApiOkResponse({ description: 'Created or replayed safe draft projection.' })
  @ApiBadRequestResponse({
    description: 'Missing or invalid request metadata.',
  })
  @ApiForbiddenResponse({ description: 'Role is not allowed to import.' })
  @ApiConflictResponse({ description: 'Duplicate or conflicting import.' })
  @ApiUnprocessableEntityResponse({
    description: 'Content or governance rejected.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized repository failure.',
  })
  import(
    @Body() input: ToeicImportDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.adminService
      .import(input, request.principal!, correlationId, idempotencyKey)
      .then((result) => ({
        data: result.data,
        meta: { correlationId, idempotencyStatus: result.idempotencyStatus },
      }));
  }

  @Post('admin/question-versions/:id/review')
  @UsePipes(strictValidation)
  @ApiBody({ type: ToeicReviewDto })
  @ApiOperation({ summary: 'Record exact-version human TOEIC review' })
  @ApiOkResponse({ description: 'Safe reviewed projection.' })
  @ApiForbiddenResponse({ description: 'Role is not allowed to review.' })
  @ApiNotFoundResponse({ description: 'Version is unknown.' })
  @ApiUnprocessableEntityResponse({
    description: 'Stale or incomplete review.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized repository failure.',
  })
  review(
    @Param('id') id: string,
    @Body() input: ToeicReviewDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.adminService
      .review(id, input, request.principal!, correlationId)
      .then((result) => ({
        data: result.data,
        meta: { correlationId, idempotencyStatus: result.idempotencyStatus },
      }));
  }

  @Post('admin/question-versions/:id/publish')
  @UsePipes(strictValidation)
  @ApiBody({ type: ToeicPublishDto })
  @ApiOperation({ summary: 'Publish reviewed, licensed TOEIC content' })
  @ApiOkResponse({ description: 'Safe published projection.' })
  @ApiForbiddenResponse({ description: 'Role is not allowed to publish.' })
  @ApiNotFoundResponse({ description: 'Version is unknown.' })
  @ApiConflictResponse({
    description: 'Version was changed or already published.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Publication gates are not satisfied.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Sanitized repository failure.',
  })
  publish(
    @Param('id') id: string,
    @Body() input: ToeicPublishDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.adminService
      .publish(id, input, request.principal!, correlationId)
      .then((result) => ({
        data: result.data,
        meta: { correlationId, idempotencyStatus: result.idempotencyStatus },
      }));
  }

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

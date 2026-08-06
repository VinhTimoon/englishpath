import {
  Body,
  Controller,
  Get,
  Headers,
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
  ) {}

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

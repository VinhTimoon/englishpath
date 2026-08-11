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
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import type { Response } from 'express';
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
import { ToeicTimedTestService } from './toeic-timed-test.service';
import {
  AnswerToeicTimedTestDto,
  StartToeicTimedTestDto,
} from './dto/toeic-timed-test.dto';
import { SubmitToeicSpeakingDto } from './dto/toeic-speaking-submission.dto';
import { ToeicSpeakingSubmissionService } from './toeic-speaking-submission.service';
import { SubmitToeicWritingDto } from './dto/toeic-writing-submission.dto';
import { ToeicWritingSubmissionService } from './toeic-writing-submission.service';
import { ToeicWritingFeedbackService } from './toeic-writing-feedback.service';
import { ToeicSpeakingFeedbackService } from './toeic-speaking-feedback.service';
import { ToeicRecordingService } from './toeic-recording.service';

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
    private readonly timed: ToeicTimedTestService,
    private readonly speakingSubmission: ToeicSpeakingSubmissionService,
    private readonly speakingFeedback: ToeicSpeakingFeedbackService,
    private readonly writingSubmission: ToeicWritingSubmissionService,
    private readonly writingFeedback: ToeicWritingFeedbackService,
    private readonly recordings: ToeicRecordingService,
  ) {}

  @Post('speaking/tasks/:taskId/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an approved TOEIC Speaking task' })
  startSpeaking(
    @Param('taskId') taskId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.speakingSubmission
      .start(request.principal!, taskId, idempotencyKey)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Get('speaking/sessions/:sessionId')
  @ApiOperation({ summary: 'Read an owner-scoped TOEIC Speaking session' })
  getSpeaking(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.speakingSubmission
      .get(request.principal!, sessionId)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Post('speaking/sessions/:sessionId/submissions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({ summary: 'Finalize a bounded TOEIC Speaking submission' })
  submitSpeaking(
    @Param('sessionId') sessionId: string,
    @Body() input: SubmitToeicSpeakingDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.speakingSubmission
      .submit(request.principal!, sessionId, input, idempotencyKey)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('speaking/sessions/:sessionId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Actor-bound key for safe Speaking feedback retries.',
  })
  @ApiOperation({
    summary: 'Request safe advisory feedback for a finalized Speaking session',
  })
  @ApiOkResponse({ description: 'Safe advisory gateway feedback projection.' })
  @ApiNotFoundResponse({ description: 'The Speaking session is unavailable.' })
  @ApiConflictResponse({ description: 'The feedback retry conflicts.' })
  @ApiUnprocessableEntityResponse({
    description:
      'Only finalized sessions with an available recording are eligible.',
  })
  requestSpeakingFeedback(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.speakingFeedback
      .request(request.principal!, sessionId, idempotencyKey, correlationId)
      .then((data) => ({
        data,
        meta: {
          correlationId,
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Get('speaking/recordings/:recordingId')
  @ApiOperation({ summary: 'Read an owner-scoped Speaking recording state' })
  @ApiNotFoundResponse({ description: 'The recording is unavailable.' })
  getSpeakingRecording(
    @Param('recordingId') recordingId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.recordings
      .get(request.principal!, recordingId)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Post('speaking/recordings/:recordingId/playback-capability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a short-lived Speaking playback capability' })
  @ApiOkResponse({
    description: 'Short-lived application playback capability.',
  })
  @ApiForbiddenResponse({ description: 'The recording cannot be played.' })
  issueSpeakingPlayback(
    @Param('recordingId') recordingId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.recordings
      .issuePlayback(request.principal!, recordingId)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'created',
        },
      }));
  }

  @Get('speaking/recordings/:recordingId/playback')
  @ApiHeader({
    name: 'X-Playback-Capability',
    required: true,
    description: 'Short-lived application capability issued by the backend.',
  })
  @ApiOperation({ summary: 'Authorize controlled Speaking playback' })
  @ApiForbiddenResponse({ description: 'The playback capability is invalid.' })
  authorizeSpeakingPlayback(
    @Param('recordingId') recordingId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-playback-capability') capability?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.recordings
      .authorizePlayback(request.principal!, recordingId, capability)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Post('speaking/recordings/:recordingId/content')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10_000_000 } }),
  )
  @ApiOperation({ summary: 'Store owner-scoped Speaking recording content' })
  @ApiOkResponse({ description: 'Recording content stored safely.' })
  uploadSpeakingRecording(
    @Param('recordingId') recordingId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.recordings
      .uploadContent(
        request.principal!,
        recordingId,
        file?.buffer ?? Buffer.alloc(0),
        file?.mimetype,
      )
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Get('speaking/recordings/:recordingId/playback/content')
  @ApiOperation({ summary: 'Stream controlled owner-scoped Speaking playback' })
  @ApiHeader({
    name: 'X-Playback-Capability',
    required: true,
    description: 'Short-lived application capability issued by the backend.',
  })
  async streamSpeakingPlayback(
    @Param('recordingId') recordingId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-playback-capability') capability: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.recordings.readPlayback(
      request.principal!,
      recordingId,
      capability,
    );
    response
      .status(HttpStatus.OK)
      .set({
        'Cache-Control': 'private, no-store',
        'Content-Type': result.contentType,
        'Content-Length': String(result.content.length),
        'Content-Disposition': 'inline',
      })
      .send(result.content);
  }

  @Post('speaking/recordings/:recordingId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a Speaking recording and its playback' })
  revokeSpeakingRecording(
    @Param('recordingId') recordingId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.recordings
      .revoke(request.principal!, recordingId)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Post('writing/tasks/:taskId/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an approved TOEIC Writing task' })
  startWriting(
    @Param('taskId') taskId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.writingSubmission
      .start(request.principal!, taskId, idempotencyKey)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Get('writing/sessions/:sessionId')
  @ApiOperation({ summary: 'Read an owner-scoped TOEIC Writing session' })
  getWriting(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.writingSubmission
      .get(request.principal!, sessionId)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }

  @Post('writing/sessions/:sessionId/submissions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({ summary: 'Finalize a bounded TOEIC Writing submission' })
  submitWriting(
    @Param('sessionId') sessionId: string,
    @Body() input: SubmitToeicWritingDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.writingSubmission
      .submit(request.principal!, sessionId, input, idempotencyKey)
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('writing/sessions/:sessionId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Actor-bound key for safe feedback retries.',
  })
  @ApiOperation({
    summary: 'Request safe advisory feedback for a finalized Writing session',
  })
  @ApiOkResponse({ description: 'Safe advisory gateway feedback projection.' })
  @ApiNotFoundResponse({ description: 'The Writing session is unavailable.' })
  @ApiConflictResponse({ description: 'The feedback retry conflicts.' })
  @ApiUnprocessableEntityResponse({
    description: 'Only finalized sessions with a submission are eligible.',
  })
  requestWritingFeedback(
    @Param('sessionId') sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.writingFeedback
      .request(request.principal!, sessionId, idempotencyKey, correlationId)
      .then((data) => ({
        data,
        meta: {
          correlationId,
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('tests/sessions')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  startTimed(
    @Body() input: StartToeicTimedTestDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.start(request.principal!, input).then((data) => ({
      data,
      meta: {
        correlationId,
        idempotencyStatus: data.replayed ? 'replayed' : 'created',
      },
    }));
  }

  @Get('tests/sessions/:sessionId')
  getTimed(
    @Param('sessionId') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.get(request.principal!, id).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Post('tests/sessions/:sessionId/answers')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  answerTimed(
    @Param('sessionId') id: string,
    @Body() input: AnswerToeicTimedTestDto,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.answer(request.principal!, id, input).then((data) => ({
      data,
      meta: {
        correlationId,
        idempotencyStatus: data.replayed ? 'replayed' : 'created',
      },
    }));
  }

  @Post('tests/sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  submitTimed(
    @Param('sessionId') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.submit(request.principal!, id).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Get('tests/sessions/:sessionId/result')
  resultTimed(
    @Param('sessionId') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.result(request.principal!, id).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

  @Get('tests/sessions/:sessionId/analysis')
  @ApiOperation({
    summary: 'Read aggregate analysis for a finalized timed test',
  })
  @ApiOkResponse({
    description:
      'Aggregate score, Part/skill summaries, weaknesses, server-clock time, and safe Error Notebook remediation state only.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            analysis: {
              type: 'object',
              properties: {
                score: {
                  type: 'object',
                  properties: {
                    correct: { type: 'integer', minimum: 0 },
                    total: { type: 'integer', minimum: 1 },
                    answered: { type: 'integer', minimum: 0 },
                  },
                },
                accuracy: { type: 'number', minimum: 0, maximum: 100 },
                skills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      skill: { type: 'string', enum: ['LISTENING', 'READING'] },
                      total: { type: 'integer', minimum: 1 },
                      answered: { type: 'integer', minimum: 0 },
                      correct: { type: 'integer', minimum: 0 },
                      accuracy: { type: 'number', minimum: 0, maximum: 100 },
                    },
                  },
                },
                parts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      part: { type: 'string', pattern: '^PART_[1-7]$' },
                      total: { type: 'integer', minimum: 1 },
                      answered: { type: 'integer', minimum: 0 },
                      correct: { type: 'integer', minimum: 0 },
                      accuracy: { type: 'number', minimum: 0, maximum: 100 },
                    },
                  },
                },
                weaknesses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      scope: { type: 'string', enum: ['part', 'skill'] },
                      name: { type: 'string' },
                      accuracy: { type: 'number', minimum: 0, maximum: 100 },
                      answered: { type: 'integer', minimum: 1 },
                    },
                  },
                },
                time: {
                  type: 'object',
                  properties: {
                    limitSeconds: { type: 'integer', minimum: 1 },
                    usedSeconds: { type: 'integer', minimum: 0 },
                    remainingSeconds: { type: 'integer', minimum: 0 },
                    averageSecondsPerAnswered: { type: 'number', minimum: 0 },
                  },
                },
              },
            },
            remediation: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['ready', 'empty', 'unavailable'],
                },
                count: { type: 'integer', minimum: 0 },
                href: {
                  type: 'string',
                  nullable: true,
                  enum: ['/error-notebook?source=TOEIC_TIMED_TEST', null],
                },
                packs: {
                  type: 'array',
                  maxItems: 6,
                  items: {
                    type: 'object',
                    properties: {
                      kind: {
                        type: 'string',
                        enum: ['VOCABULARY', 'GRAMMAR', 'PRACTICE'],
                      },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      href: { type: 'string' },
                      relatedLabel: { type: 'string' },
                    },
                    required: ['kind', 'title', 'description', 'href'],
                  },
                },
              },
              required: ['status', 'count', 'href', 'packs'],
            },
          },
        },
        meta: { type: 'object' },
      },
    },
  })
  analysisTimed(
    @Param('sessionId') id: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.timed.analysis(request.principal!, id).then((data) => ({
      data,
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    }));
  }

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

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { RoadmapExceptionFilter } from '../roadmap/roadmap-exception.filter';
import {
  AnswerPracticeDto,
  ErrorNotebookQueryDto,
  StartPracticeDto,
} from './dto/practice.dto';
import { PracticeService } from './practice.service';

@ApiTags('daily-practice')
@ApiBearerAuth()
@Controller('api/v1/quiz/session')
@UseFilters(RoadmapExceptionFilter)
@UseGuards(AuthenticationGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PracticeController {
  constructor(private readonly service: PracticeService) {}

  @Post()
  start(
    @Req() request: AuthenticatedRequest,
    @Body() input: StartPracticeDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.start(request.principal!, input.clientSessionId),
      correlation,
    );
  }

  @Post(':sessionId/answer')
  answer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() input: AnswerPracticeDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.answer(request.principal!, sessionId, input),
      correlation,
    );
  }

  @Post(':sessionId/submit')
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.submit(request.principal!, sessionId),
      correlation,
    );
  }

  @Get(':sessionId/result')
  result(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.result(request.principal!, sessionId),
      correlation,
    );
  }

  @Get('summary/progress')
  progressSummary(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(this.service.summary(request.principal!), correlation);
  }

  @Get('summary/errors')
  @ApiOkResponse({
    description:
      'Owner-scoped Error Notebook entries with additive cross-skill coverage.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            entries: { type: 'array', items: { type: 'object' } },
            pagination: { type: 'object' },
            coverage: {
              type: 'object',
              properties: {
                domains: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['domain', 'state', 'entryCount'],
                    properties: {
                      domain: {
                        type: 'string',
                        enum: [
                          'GENERAL',
                          'LISTENING',
                          'READING',
                          'SPEAKING',
                          'WRITING',
                        ],
                      },
                      state: {
                        type: 'string',
                        enum: ['available', 'empty', 'unavailable'],
                      },
                      entryCount: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  errorNotebook(
    @Req() request: AuthenticatedRequest,
    @Query() query: ErrorNotebookQueryDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.errors(request.principal!, query),
      correlation,
    );
  }

  private async wrap<T>(data: Promise<T>, correlation?: string) {
    return {
      data: await data,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'not_applicable',
      },
    };
  }
}

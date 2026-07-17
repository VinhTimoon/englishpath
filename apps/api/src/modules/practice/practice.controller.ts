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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { RoadmapExceptionFilter } from '../roadmap/roadmap-exception.filter';
import { AnswerPracticeDto, StartPracticeDto } from './dto/practice.dto';
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

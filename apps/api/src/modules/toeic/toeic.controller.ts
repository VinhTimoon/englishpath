import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '../auth/auth.guards';
import { authCorrelationId } from '../auth/auth-exception.filter';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { ToeicQuestionQueryDto } from './dto/toeic-question-query.dto';
import { ToeicQuestionService } from './toeic-question.service';
const strict = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
@ApiTags('toeic')
@ApiBearerAuth()
@Controller('api/v1/toeic')
@UseGuards(AuthenticationGuard)
export class ToeicController {
  constructor(private readonly service: ToeicQuestionService) {}
  @Get('questions') @UsePipes(strict) list(
    @Query() q: ToeicQuestionQueryDto,
    @Headers('x-correlation-id') c?: string,
  ) {
    return this.service
      .list(q)
      .then((x) => ({
        ...x,
        meta: {
          correlationId: authCorrelationId(c),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }
  @Get('questions/:id') get(
    @Req() _r: AuthenticatedRequest,
    @Param('id') id: string,
    @Headers('x-correlation-id') c?: string,
  ) {
    return this.service
      .get(id)
      .then((x) => ({
        ...x,
        meta: {
          correlationId: authCorrelationId(c),
          idempotencyStatus: 'not_applicable',
        },
      }));
  }
}

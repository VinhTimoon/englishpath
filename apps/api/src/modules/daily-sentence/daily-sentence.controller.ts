import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AuthenticationGuard } from '../auth/auth.guards';
import { SubmitDailySentenceDto } from './dto/submit-daily-sentence.dto';
import { DailySentenceService } from './daily-sentence.service';
@ApiTags('daily-sentence')
@ApiBearerAuth()
@Controller('api/v1/daily-sentences')
@UseGuards(AuthenticationGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class DailySentenceController {
  constructor(private readonly service: DailySentenceService) {}
  @Get('today') today(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(this.service.today(request.principal!), correlation);
  }
  @Post(':sentenceId/submit') submit(
    @Req() request: AuthenticatedRequest,
    @Param('sentenceId') sentenceId: string,
    @Body() input: SubmitDailySentenceDto,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    return this.wrap(
      this.service.submit(request.principal!, sentenceId, input.answer),
      correlation,
    );
  }
  private async wrap<T>(result: Promise<T>, correlation?: string) {
    return {
      data: await result,
      meta: {
        correlationId: correlation ?? crypto.randomUUID(),
        idempotencyStatus: 'replayed_or_created',
      },
    };
  }
}

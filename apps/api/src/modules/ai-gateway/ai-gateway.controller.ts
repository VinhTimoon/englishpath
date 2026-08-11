import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { authCorrelationId } from '../auth/auth-exception.filter';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { AuthenticationGuard } from '../auth/auth.guards';
import { AiFeedbackRequestDto } from './ai-feedback.dto';
import { AiFeedbackGatewayService } from './ai-feedback.service';
import { AiExplanationRequestDto } from './ai-explanation.dto';
import { AiExplanationGatewayService } from './ai-explanation.service';
import { AiGatewayExceptionFilter } from './ai-gateway-exception.filter';

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('ai-gateway')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Correlation-Id',
  required: false,
  description: 'Validated correlation ID; generated when omitted.',
})
@Controller('api/v1/ai-gateway')
@UseGuards(AuthenticationGuard)
@UseFilters(AiGatewayExceptionFilter)
export class AiGatewayController {
  constructor(
    private readonly gateway: AiFeedbackGatewayService,
    private readonly explanationGateway: AiExplanationGatewayService,
  ) {}

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiOperation({
    summary: 'Request bounded advisory feedback through the local gateway',
  })
  requestFeedback(
    @Body() input: AiFeedbackRequestDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.gateway
      .request(request.principal!, input, idempotencyKey, correlationId)
      .then((data) => ({
        data,
        meta: {
          correlationId,
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }

  @Post('explanation')
  @HttpCode(HttpStatus.OK)
  @UsePipes(strictValidation)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Required retry key for the owner-scoped explanation request.',
  })
  @ApiOperation({
    summary: 'Request a grounded advisory explanation from the Error Notebook',
  })
  requestExplanation(
    @Body() input: AiExplanationRequestDto,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return this.explanationGateway
      .request(request.principal!, input, idempotencyKey, correlationId)
      .then((result) => ({
        data: result.explanation,
        meta: {
          correlationId,
          idempotencyStatus: result.replayed ? 'replayed' : 'created',
        },
      }));
  }
}

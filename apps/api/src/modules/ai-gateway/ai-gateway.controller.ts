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
  constructor(private readonly gateway: AiFeedbackGatewayService) {}

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
    return this.gateway
      .request(
        request.principal!,
        input,
        idempotencyKey,
        authCorrelationId(correlation),
      )
      .then((data) => ({
        data,
        meta: {
          correlationId: authCorrelationId(correlation),
          idempotencyStatus: data.replayed ? 'replayed' : 'created',
        },
      }));
  }
}

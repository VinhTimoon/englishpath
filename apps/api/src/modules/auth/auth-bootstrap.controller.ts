import { Controller, Headers, Post, Req, UseFilters } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { extractBearerToken } from '../access';
import { AuthBootstrapService } from './auth-bootstrap.service';
import {
  authCorrelationId,
  AuthExceptionFilter,
} from './auth-exception.filter';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('api/v1/auth')
@UseFilters(AuthExceptionFilter)
export class AuthBootstrapController {
  constructor(private readonly service: AuthBootstrapService) {}

  @Post('bootstrap')
  @ApiOperation({
    summary: 'Provision the application identity after verified sign-in',
  })
  @ApiCreatedResponse({
    description: 'Application principal and backend roles',
  })
  async bootstrap(
    @Req() request: Request,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const principal = await this.service.bootstrap(
      extractBearerToken(request.headers.authorization),
    );
    return {
      data: principal
        ? {
            userId: principal.applicationUserId,
            roles: principal.roles,
          }
        : null,
      meta: {
        correlationId: authCorrelationId(correlation),
        idempotencyStatus: 'replayed_or_created',
      },
    };
  }
}

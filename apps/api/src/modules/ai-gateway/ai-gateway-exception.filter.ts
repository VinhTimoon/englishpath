import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isAccessError } from '../access';
import { authCorrelationId } from '../auth/auth-exception.filter';

@Catch()
export class AiGatewayExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const correlationId = authCorrelationId(
      request.headers['x-correlation-id'],
    );
    if (isAccessError(exception)) {
      const status =
        exception.code === 'FORBIDDEN_ROLE' ||
        exception.code === 'FORBIDDEN_OWNERSHIP'
          ? 403
          : 401;
      response.status(status).json({
        error: {
          code: status === 403 ? 'RESOURCE_FORBIDDEN' : 'AUTH_REQUIRED',
          message: 'Access is forbidden.',
          details: [],
        },
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code =
        status === 409
          ? 'IDEMPOTENCY_CONFLICT'
          : status === 422
            ? 'VALIDATION_FAILED'
            : 'REQUEST_INVALID';
      response.status(status).json({
        error: {
          code,
          message: 'The feedback request could not be accepted.',
          details: [],
        },
        meta: { correlationId, idempotencyStatus: 'not_applicable' },
      });
      return;
    }
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        details: [],
      },
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    });
  }
}

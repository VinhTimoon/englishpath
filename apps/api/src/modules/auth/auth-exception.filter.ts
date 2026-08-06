import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { isAccessError, ACCESS_ERROR_CODES } from '../access';
import { IdentityError, IDENTITY_ERROR_CODES } from '../identity';
import { createCorrelationContext } from '../observability';

export function authCorrelationId(value: unknown) {
  return createCorrelationContext(value, () => `corr-${randomUUID()}`)
    .correlationId;
}

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';

    if (exception instanceof BadRequestException) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (isAccessError(exception)) {
      const forbidden = [
        ACCESS_ERROR_CODES.FORBIDDEN_ROLE,
        ACCESS_ERROR_CODES.FORBIDDEN_OWNERSHIP,
        ACCESS_ERROR_CODES.APPLICATION_IDENTITY_UNRESOLVED,
      ].includes(exception.code as never);
      status = forbidden ? 403 : 401;
      code = forbidden
        ? 'RESOURCE_FORBIDDEN'
        : exception.code === ACCESS_ERROR_CODES.MISSING_BEARER_CREDENTIAL
          ? 'AUTH_REQUIRED'
          : 'AUTH_INVALID_TOKEN';
      message = forbidden ? 'Access is forbidden.' : 'Authentication failed.';
    } else if (exception instanceof IdentityError) {
      if (exception.code === IDENTITY_ERROR_CODES.FORBIDDEN_OWNERSHIP) {
        status = 403;
        code = 'RESOURCE_FORBIDDEN';
        message = 'Access is forbidden.';
      } else if (exception.code === IDENTITY_ERROR_CODES.INVALID_PROFILE) {
        status = 400;
        code = 'VALIDATION_FAILED';
        message = 'Request validation failed.';
      }
    }

    let correlationId: string;
    try {
      correlationId =
        (request as Request & { correlationId?: string }).correlationId ??
        authCorrelationId(request.headers['x-correlation-id']);
    } catch {
      correlationId = authCorrelationId(undefined);
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    }
    response.status(status).json({
      error: { code, message, details: [] },
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    });
  }
}

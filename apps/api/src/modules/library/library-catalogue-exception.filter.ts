import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  Catch,
  ExceptionFilter,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ACCESS_ERROR_CODES, isAccessError } from '../access';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { createCorrelationContext } from '../observability';

function correlationId(value: unknown) {
  return createCorrelationContext(value, () => authCorrelationId(undefined))
    .correlationId;
}

@Catch()
export class LibraryCatalogueExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';

    if (isAccessError(exception)) {
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
    } else if (exception instanceof BadRequestException) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (exception instanceof NotFoundException) {
      status = 404;
      code = 'LIBRARY_ITEM_NOT_FOUND';
      message = 'Library item not found.';
    } else if (exception instanceof ServiceUnavailableException) {
      status = 503;
      code = 'CATALOGUE_UNAVAILABLE';
      message = 'Library catalogue unavailable.';
    }

    response.status(status).json({
      error: { code, message, details: [] },
      meta: {
        correlationId: correlationId(request.headers['x-correlation-id']),
        idempotencyStatus: 'not_applicable',
      },
    });
  }
}

import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isAccessError } from '../access';
import { authCorrelationId } from '../auth/auth-exception.filter';

@Catch()
export class RoadmapExceptionFilter implements ExceptionFilter {
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
    } else if (exception instanceof NotFoundException) {
      status = 404;
      code = 'RESOURCE_NOT_FOUND';
      message = 'The requested roadmap resource was not found.';
    } else if (exception instanceof ConflictException) {
      status = 409;
      code = 'ROADMAP_PREREQUISITE_MISSING';
      message = 'Complete the required learner entry steps first.';
    } else if (isAccessError(exception)) {
      status = 401;
      code = 'AUTH_REQUIRED';
      message = 'Authentication failed.';
    }

    let correlationId: string;
    try {
      correlationId = authCorrelationId(request.headers['x-correlation-id']);
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

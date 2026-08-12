import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isAccessError } from '../access';
import {
  AuthExceptionFilter,
  authCorrelationId,
} from '../auth/auth-exception.filter';

@Catch()
export class CommunityExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (isAccessError(exception))
      return new AuthExceptionFilter().catch(exception, host);
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    if (exception instanceof BadRequestException) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (exception instanceof UnprocessableEntityException) {
      status = 422;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (exception instanceof NotFoundException) {
      status = 404;
      code = 'RESOURCE_NOT_FOUND';
      message = 'The requested community resource was not found.';
    } else if (exception instanceof ConflictException) {
      status = 409;
      code = 'COMMUNITY_CONFLICT';
      message = 'The community request conflicts with its current state.';
    }
    const correlationId = authCorrelationId(
      request.headers['x-correlation-id'],
    );
    response.status(status).json({
      error: { code, message, details: [] },
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    });
  }
}

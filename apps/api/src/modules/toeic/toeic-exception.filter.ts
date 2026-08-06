import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { isAccessError, ACCESS_ERROR_CODES } from '../access';
import { createCorrelationContext } from '../observability';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';

export function toeicCorrelationId(value: unknown) {
  return createCorrelationContext(value, () => `corr-${randomUUID()}`)
    .correlationId;
}

@Catch()
export class ToeicExceptionFilter implements ExceptionFilter {
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
    } else if (exception instanceof ToeicQuestionError) {
      if (exception.code === TOEIC_ERROR_CODES.NOT_FOUND) {
        status = 404;
        code = 'RESOURCE_NOT_FOUND';
        message = 'TOEIC question was not found.';
      } else {
        message = 'TOEIC questions are temporarily unavailable.';
      }
    }

    let correlationId: string;
    try {
      correlationId = toeicCorrelationId(request.headers['x-correlation-id']);
    } catch {
      correlationId = toeicCorrelationId(undefined);
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

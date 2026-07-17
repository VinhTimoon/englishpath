import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { createCorrelationContext } from '../observability';
import { VOCABULARY_ERROR_CODES, VocabularyError } from './vocabulary.error';

export function vocabularyCorrelationId(value: unknown) {
  return createCorrelationContext(value, () => `corr-${randomUUID()}`)
    .correlationId;
}

@Catch()
export class VocabularyExceptionFilter implements ExceptionFilter {
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
    } else if (exception instanceof VocabularyError) {
      if (exception.code === VOCABULARY_ERROR_CODES.INVALID_QUERY) {
        status = 400;
        code = 'VALIDATION_FAILED';
        message = exception.message;
      } else if (exception.code === VOCABULARY_ERROR_CODES.ROOT_NOT_FOUND) {
        status = 404;
        code = 'RESOURCE_NOT_FOUND';
        message = exception.message;
      }
    }

    let correlationId: string;
    try {
      correlationId = vocabularyCorrelationId(
        request.headers['x-correlation-id'],
      );
    } catch {
      correlationId = vocabularyCorrelationId(undefined);
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

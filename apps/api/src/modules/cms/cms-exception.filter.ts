import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isAccessError, ACCESS_ERROR_CODES } from '../access';
import { authCorrelationId } from '../auth/auth-exception.filter';
import {
  CONTENT_GOVERNANCE_ERROR_CODES,
  ContentGovernanceError,
} from '../content-governance';

@Catch()
export class CmsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';

    if (exception instanceof BadRequestException) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (isAccessError(exception)) {
      status = exception.code === ACCESS_ERROR_CODES.FORBIDDEN_ROLE ? 403 : 401;
      code = status === 403 ? 'RESOURCE_FORBIDDEN' : 'AUTH_INVALID_TOKEN';
      message =
        status === 403 ? 'Access is forbidden.' : 'Authentication failed.';
    } else if (exception instanceof ContentGovernanceError) {
      const conflictCodes: readonly string[] = [
        CONTENT_GOVERNANCE_ERROR_CODES.INVALID_TRANSITION,
        CONTENT_GOVERNANCE_ERROR_CODES.REVIEW_EVIDENCE_MISMATCH,
        CONTENT_GOVERNANCE_ERROR_CODES.REVISION_EVIDENCE_UNCHANGED,
      ];
      const conflict = conflictCodes.includes(exception.code);
      status = conflict ? 409 : 400;
      code = conflict ? 'CONFLICT' : 'VALIDATION_FAILED';
      message = exception.message;
    } else if (
      exception instanceof Error &&
      exception.message === 'Content version not found.'
    ) {
      status = 404;
      code = 'RESOURCE_NOT_FOUND';
      message = 'Content version was not found.';
    } else if (
      exception instanceof Error &&
      exception.message === 'Invalid taxonomy parent.'
    ) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (
      exception instanceof Error &&
      exception.message === 'Invalid taxonomy.'
    ) {
      status = 400;
      code = 'VALIDATION_FAILED';
      message = 'Request validation failed.';
    } else if (
      exception instanceof Error &&
      exception.message === 'Content version is already published.'
    ) {
      status = 409;
      code = 'CONFLICT';
      message = 'Content version is already published.';
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

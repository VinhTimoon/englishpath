import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { isAccessError, ACCESS_ERROR_CODES } from '../access';
import { AuditService } from '../audit/audit.service';
import { createCorrelationContext } from '../observability';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';

export function toeicCorrelationId(value: unknown) {
  return createCorrelationContext(value, () => `corr-${randomUUID()}`)
    .correlationId;
}

@Catch()
export class ToeicExceptionFilter implements ExceptionFilter {
  constructor(private readonly audit: AuditService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
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
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (status === 409) {
        code = 'IDEMPOTENCY_CONFLICT';
        message = 'The TOEIC request conflicts with an existing request.';
      } else if (status === 422) {
        code = 'VALIDATION_FAILED';
        message = 'The TOEIC request cannot be accepted.';
      } else {
        code = status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_INVALID';
        message =
          status >= 500
            ? 'An unexpected error occurred.'
            : 'The TOEIC request is invalid.';
      }
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
      switch (exception.code) {
        case TOEIC_ERROR_CODES.NOT_FOUND:
          status = 404;
          code = 'RESOURCE_NOT_FOUND';
          message = 'TOEIC question was not found.';
          break;
        case TOEIC_ERROR_CODES.FORBIDDEN:
          status = 403;
          code = 'RESOURCE_FORBIDDEN';
          message = 'Access is forbidden.';
          break;
        case TOEIC_ERROR_CODES.CONFLICT:
          status = 409;
          code = 'IDEMPOTENCY_CONFLICT';
          message =
            'The TOEIC content request conflicts with existing content.';
          break;
        case TOEIC_ERROR_CODES.INVALID_CONTENT:
        case TOEIC_ERROR_CODES.INVALID_LINEAGE:
        case TOEIC_ERROR_CODES.STALE_REVIEW:
        case TOEIC_ERROR_CODES.NOT_PUBLISHABLE:
          status = 422;
          code = 'VALIDATION_FAILED';
          message = 'The TOEIC content cannot enter this lifecycle state.';
          break;
        case TOEIC_ERROR_CODES.MISSING_IDEMPOTENCY_KEY:
          status = 400;
          code = 'VALIDATION_FAILED';
          message = 'An Idempotency-Key header is required.';
          break;
        case TOEIC_ERROR_CODES.INCOMPLETE:
          status = 422;
          code = 'INCOMPLETE_SESSION';
          message = 'All selected questions must be answered.';
          break;
        case TOEIC_ERROR_CODES.RECORDING_UNAVAILABLE:
          status = 422;
          code = 'RECORDING_UNAVAILABLE';
          message = 'The recording is not available for playback.';
          break;
        case TOEIC_ERROR_CODES.CAPABILITY_INVALID:
          status = 403;
          code = 'PLAYBACK_FORBIDDEN';
          message = 'The playback capability is invalid or expired.';
          break;
        default:
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

    const adminRequest = request.path.includes('/api/v1/toeic/admin/');
    if (
      adminRequest &&
      (exception instanceof BadRequestException || isAccessError(exception))
    ) {
      const principal = (
        request as Request & {
          principal?: { applicationUserId?: string };
        }
      ).principal;
      const action = request.path.includes('/question-versions/import')
        ? 'toeic.question.import'
        : request.path.includes('/question-versions/') &&
            request.path.endsWith('/review')
          ? 'toeic.question.review'
          : request.path.includes('/question-versions/') &&
              request.path.endsWith('/publish')
            ? 'toeic.question.publish'
            : 'toeic.question.admin';
      try {
        await this.audit.append({
          ...(principal?.applicationUserId
            ? { actorUserId: principal.applicationUserId }
            : {}),
          action,
          target: 'admin',
          policyResult: 'DENY',
          correlationId,
          attributes: { outcome: 'denied' },
        });
      } catch {
        // Do not report a normal denial when its required audit decision could
        // not be persisted. Return a sanitized failure instead.
        status = 500;
        code = 'INTERNAL_ERROR';
        message = 'An unexpected error occurred.';
      }
    }

    response.status(status).json({
      error: { code, message, details: [] },
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    });
  }
}

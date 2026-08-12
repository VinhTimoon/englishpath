import {
  Controller,
  Get,
  Headers,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth-request';
import {
  authCorrelationId,
  AuthExceptionFilter,
} from '../auth/auth-exception.filter';
import { RequireAnyRole } from '../auth/auth.decorators';
import { AdminAuthenticationGuard } from './admin-authentication.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminService } from './admin.service';

const ERROR_ENVELOPE_SCHEMA = {
  type: 'object',
  required: ['error', 'meta'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message', 'details'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
    meta: {
      type: 'object',
      required: ['correlationId', 'idempotencyStatus'],
      properties: {
        correlationId: { type: 'string' },
        idempotencyStatus: { type: 'string', enum: ['not_applicable'] },
      },
    },
  },
};

const AI_OPERATIONS_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['data', 'meta'],
  properties: {
    data: {
      type: 'object',
      additionalProperties: false,
      required: [
        'role',
        'window',
        'totals',
        'featureSummary',
        'skillSummary',
        'replayed',
        'abuse',
      ],
      properties: {
        role: {
          type: 'string',
          enum: ['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN'],
        },
        window: {
          type: 'object',
          additionalProperties: false,
          required: ['start', 'end', 'hours'],
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
            hours: { type: 'integer', enum: [24] },
          },
        },
        totals: {
          type: 'object',
          additionalProperties: false,
          required: [
            'requests',
            'allowed',
            'denied',
            'unavailable',
            'quotaDenials',
            'estimatedCostMicros',
          ],
          properties: {
            requests: { type: 'integer', minimum: 0 },
            allowed: { type: 'integer', minimum: 0 },
            denied: { type: 'integer', minimum: 0 },
            unavailable: { type: 'integer', minimum: 0 },
            quotaDenials: { type: 'integer', minimum: 0 },
            estimatedCostMicros: { type: 'integer', minimum: 0 },
          },
        },
        featureSummary: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['key', 'count'],
            properties: {
              key: {
                type: 'string',
                enum: ['SPEAKING', 'WRITING', 'EXPLANATION'],
              },
              count: { type: 'integer', minimum: 0 },
            },
          },
        },
        skillSummary: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['key', 'count'],
            properties: {
              key: {
                type: 'string',
                enum: ['SPEAKING', 'WRITING', 'EXPLANATION'],
              },
              count: { type: 'integer', minimum: 0 },
            },
          },
        },
        replayed: {
          type: 'object',
          additionalProperties: false,
          required: ['state'],
          properties: { state: { type: 'string', enum: ['unavailable'] } },
        },
        abuse: {
          type: 'object',
          additionalProperties: false,
          required: ['state'],
          properties: { state: { type: 'string', enum: ['unavailable'] } },
        },
      },
    },
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['correlationId', 'idempotencyStatus'],
      properties: {
        correlationId: { type: 'string' },
        idempotencyStatus: { type: 'string', enum: ['not_applicable'] },
      },
    },
  },
};

@ApiTags('admin')
@ApiBearerAuth()
@Controller('api/v1/admin')
@UseFilters(AuthExceptionFilter)
@UseGuards(AdminAuthenticationGuard, AdminRoleGuard)
@RequireAnyRole('CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN')
@ApiHeader({
  name: 'X-Correlation-Id',
  required: false,
  description: 'Validated correlation ID; generated when omitted.',
})
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Read the authorized administrative shell overview',
  })
  @ApiOkResponse({
    description: 'Safe role-scoped administrative overview',
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'object',
          required: ['role', 'capabilities'],
          properties: {
            role: {
              type: 'string',
              enum: ['CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN'],
            },
            capabilities: { type: 'array', items: { type: 'string' } },
            operationalSummary: {
              type: 'object',
              required: ['activeUsers', 'activeRoleAssignments'],
              properties: {
                activeUsers: { type: 'integer', minimum: 0 },
                activeRoleAssignments: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
        meta: {
          type: 'object',
          required: ['correlationId', 'idempotencyStatus'],
          properties: {
            correlationId: { type: 'string' },
            idempotencyStatus: { type: 'string', enum: ['not_applicable'] },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid identity evidence',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiForbiddenResponse({
    description: 'The application role is not allowed',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiBadRequestResponse({
    description: 'The correlation header is invalid',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'A sanitized server error',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  async overview(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return {
      data: await this.service.overview(request.principal!, correlationId),
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    };
  }

  @Get('ai-operations')
  @ApiOperation({
    summary: 'Read the redacted AI gateway operations projection',
  })
  @ApiOkResponse({
    description: 'Bounded server-owned AI usage aggregates',
    schema: AI_OPERATIONS_RESPONSE_SCHEMA,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid identity evidence',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiForbiddenResponse({
    description: 'The application role is not allowed',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiBadRequestResponse({
    description: 'The correlation header is invalid',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  @ApiInternalServerErrorResponse({
    description: 'A sanitized server error',
    schema: ERROR_ENVELOPE_SCHEMA,
  })
  async aiOperations(
    @Req() request: AuthenticatedRequest,
    @Headers('x-correlation-id') correlation?: string,
  ) {
    const correlationId = authCorrelationId(correlation);
    return {
      data: await this.service.aiOperations(request.principal!, correlationId),
      meta: { correlationId, idempotencyStatus: 'not_applicable' },
    };
  }
}

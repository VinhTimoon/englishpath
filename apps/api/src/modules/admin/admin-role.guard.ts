import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessError, ACCESS_ERROR_CODES } from '../access';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { REQUIRED_ROLE } from '../auth/auth.decorators';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<
      string | readonly string[]
    >(REQUIRED_ROLE, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.principal;
    const allowed = principal
      ? typeof required === 'string'
        ? principal.roles.includes(required)
        : required.some((role) => principal.roles.includes(role))
      : false;
    if (allowed) return true;

    const correlationId =
      request.correlationId ??
      (() => {
        try {
          return authCorrelationId(request.headers['x-correlation-id']);
        } catch {
          const generated = authCorrelationId(undefined);
          request.correlationId = generated;
          return generated;
        }
      })();
    try {
      await this.audit.append({
        ...(principal?.applicationUserId
          ? { actorUserId: principal.applicationUserId }
          : {}),
        action: 'admin.overview.read',
        target: 'admin.overview',
        policyResult: 'DENY',
        correlationId,
        attributes: { capability: 'editor_shell', outcome: 'forbidden' },
      });
    } catch {
      // Authorization remains fail-closed if audit persistence is unavailable.
    }
    throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
  }
}

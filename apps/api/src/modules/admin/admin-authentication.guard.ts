import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request';
import { authCorrelationId } from '../auth/auth-exception.filter';
import { AuthenticationGuard } from '../auth/auth.guards';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminAuthenticationGuard implements CanActivate {
  constructor(
    private readonly authentication: AuthenticationGuard,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.correlationId = authCorrelationId(
        request.headers['x-correlation-id'],
      );
    } catch {
      request.correlationId = authCorrelationId(undefined);
    }
    try {
      return await this.authentication.canActivate(context);
    } catch (error) {
      try {
        await this.audit.append({
          action: 'admin.overview.read',
          target: 'admin.overview',
          policyResult: 'DENY',
          correlationId: request.correlationId,
          attributes: { capability: 'authentication', outcome: 'denied' },
        });
      } catch {
        // Authentication remains fail-closed if audit persistence is unavailable.
      }
      throw error;
    }
  }
}

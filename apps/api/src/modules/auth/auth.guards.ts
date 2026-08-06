import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AccessError,
  ACCESS_ERROR_CODES,
  requireApplicationRole,
  requireOwnership,
  resolveApplicationPrincipalOrThrow,
  extractBearerToken,
  type ApplicationPrincipalResolver,
  type ExternalIdentityVerifier,
} from '../access';
import type { AuthenticatedRequest } from './auth-request';
import { REQUIRED_OWNER, REQUIRED_ROLE } from './auth.decorators';
import {
  APPLICATION_PRINCIPAL_RESOLVER,
  EXTERNAL_IDENTITY_VERIFIER,
} from './auth.tokens';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(EXTERNAL_IDENTITY_VERIFIER)
    private readonly verifier: ExternalIdentityVerifier,
    @Inject(APPLICATION_PRINCIPAL_RESOLVER)
    private readonly resolver: ApplicationPrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    const identity = await this.verifier.verify(token);
    request.principal = await resolveApplicationPrincipalOrThrow(
      this.resolver,
      identity,
    );
    return true;
  }
}

@Injectable()
export class RequiredRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const role = this.reflector.getAllAndOverride<string | readonly string[]>(
      REQUIRED_ROLE,
      [context.getHandler(), context.getClass()],
    );
    if (!role) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (typeof role !== 'string') {
      if (
        !role.some((candidate) => request.principal!.roles.includes(candidate))
      ) {
        throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
      }
    } else {
      requireApplicationRole(request.principal!, role);
    }
    return true;
  }
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const resourceType = this.reflector.getAllAndOverride<string>(
      REQUIRED_OWNER,
      [context.getHandler(), context.getClass()],
    );
    if (!resourceType) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.principal!;
    const routeUserId = request.params?.userId;
    requireOwnership(principal, {
      resourceType,
      resourceId:
        typeof routeUserId === 'string'
          ? routeUserId
          : principal.applicationUserId,
    });
    return true;
  }
}

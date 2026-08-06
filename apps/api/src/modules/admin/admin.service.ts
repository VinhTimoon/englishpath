import { Injectable } from '@nestjs/common';
import {
  AccessError,
  ACCESS_ERROR_CODES,
  type ApplicationPrincipal,
} from '../access';
import { AuditService } from '../audit/audit.service';
import { AdminRepository } from './admin.repository';

type PrivilegedRole = 'CONTENT_EDITOR' | 'ADMIN' | 'SUPER_ADMIN';

function resolvePrivilegedRole(
  roles: readonly string[],
): PrivilegedRole | null {
  if (roles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('CONTENT_EDITOR')) return 'CONTENT_EDITOR';
  return null;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly audit: AuditService,
  ) {}

  async overview(principal: ApplicationPrincipal, correlationId: string) {
    const role = resolvePrivilegedRole(principal.roles);
    if (!role) {
      await this.audit.append({
        actorUserId: principal.applicationUserId,
        action: 'admin.overview.read',
        target: 'admin.overview',
        policyResult: 'DENY',
        correlationId,
        attributes: { capability: 'editor_shell', outcome: 'forbidden' },
      });
      throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
    }

    await this.audit.append({
      actorUserId: principal.applicationUserId,
      action: 'admin.overview.read',
      target: 'admin.overview',
      policyResult: 'ALLOW',
      correlationId,
      attributes: { capability: 'editor_shell', role },
    });

    const capabilities = ['editor_shell'] as string[];
    const data: {
      role: PrivilegedRole;
      capabilities: string[];
      operationalSummary?: {
        activeUsers: number;
        activeRoleAssignments: number;
      };
    } = { role, capabilities };
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      capabilities.push('operational_summary');
      data.operationalSummary = await this.repository.operationalSummary();
    }

    return data;
  }
}

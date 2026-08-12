import { Inject, Injectable } from '@nestjs/common';
import {
  AccessError,
  ACCESS_ERROR_CODES,
  type ApplicationPrincipal,
} from '../access';
import { AuditService } from '../audit/audit.service';
import { AdminRepository } from './admin.repository';
import {
  AI_FEEDBACK_OUTCOMES,
  AI_FEEDBACK_USAGE_REPOSITORY,
} from '../ai-gateway/ai-feedback.models';
import {
  AI_OPERATIONS_FEATURES,
  AI_OPERATIONS_SKILLS,
  AI_OPERATIONS_WINDOW_HOURS,
  type AiOperationsEvidence,
} from './ai-operations.models';

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
    @Inject(AI_FEEDBACK_USAGE_REPOSITORY)
    private readonly usage: {
      aggregateSince(since: Date): Promise<AiOperationsEvidence>;
    },
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

  async aiOperations(principal: ApplicationPrincipal, correlationId: string) {
    const role = resolvePrivilegedRole(principal.roles);
    if (!role) throw new AccessError(ACCESS_ERROR_CODES.FORBIDDEN_ROLE);
    const end = new Date();
    const start = new Date(
      end.getTime() - AI_OPERATIONS_WINDOW_HOURS * 60 * 60 * 1000,
    );
    if (!this.usage.aggregateSince) {
      throw new Error('AI operations evidence is unavailable.');
    }
    const evidence = await this.usage.aggregateSince(start);
    const outcomes = toCounts(evidence.outcomes, AI_FEEDBACK_OUTCOMES);
    const features = toCounts(evidence.features, AI_OPERATIONS_FEATURES);
    const skills = toCounts(evidence.skills, AI_OPERATIONS_SKILLS);
    const outcomeTotal = Object.values(outcomes).reduce(
      (sum, count) => sum + count,
      0,
    );
    const featureTotal = Object.values(features).reduce(
      (sum, count) => sum + count,
      0,
    );
    const skillTotal = Object.values(skills).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (
      !Number.isSafeInteger(evidence.totalRequests) ||
      evidence.totalRequests < 0 ||
      outcomeTotal !== evidence.totalRequests ||
      featureTotal !== evidence.totalRequests ||
      skillTotal !== evidence.totalRequests ||
      !Number.isSafeInteger(evidence.estimatedCostMicros) ||
      evidence.estimatedCostMicros < 0
    ) {
      throw new Error('AI operations evidence is inconsistent.');
    }
    await this.audit.append({
      actorUserId: principal.applicationUserId,
      action: 'admin.ai_operations.read',
      target: 'admin.ai_operations',
      policyResult: 'ALLOW',
      correlationId,
      attributes: { role },
    });
    return {
      role,
      window: {
        start: start.toISOString(),
        end: end.toISOString(),
        hours: AI_OPERATIONS_WINDOW_HOURS,
      },
      totals: {
        requests: evidence.totalRequests,
        allowed: outcomes.ALLOWED,
        denied: outcomes.DENIED,
        unavailable: outcomes.PROVIDER_UNAVAILABLE,
        quotaDenials: outcomes.DENIED,
        estimatedCostMicros: evidence.estimatedCostMicros,
      },
      featureSummary: toSummary(features),
      skillSummary: toSummary(skills),
      replayed: { state: 'unavailable' },
      abuse: { state: 'unavailable' },
    };
  }
}

function toCounts<const T extends readonly string[]>(
  groups: readonly { key: string; count: number }[],
  allowed: T,
) {
  const counts = Object.fromEntries(allowed.map((key) => [key, 0])) as Record<
    T[number],
    number
  >;
  const seen = new Set<string>();
  for (const group of groups) {
    if (
      !allowed.includes(group.key) ||
      !Number.isSafeInteger(group.count) ||
      group.count < 0 ||
      seen.has(group.key)
    ) {
      throw new Error('AI operations evidence is malformed.');
    }
    seen.add(group.key);
    counts[group.key as T[number]] = group.count;
  }
  return counts;
}

function toSummary(counts: Record<string, number>) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, count }));
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { AuditRepository, type AuditEntry } from './audit.repository';

const SAFE_ATTRIBUTE_KEYS = new Set(['capability', 'count', 'outcome', 'role']);
const SENSITIVE_KEY_PATTERN =
  /(token|password|claim|secret|answer|payload|email|phone|path|location|identity|name)/i;
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const AUDIT_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function boundedText(
  value: string,
  maxLength: number,
  field: string,
  pattern = AUDIT_IDENTIFIER_PATTERN,
) {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    !pattern.test(normalized)
  ) {
    throw new Error(`Invalid audit ${field}.`);
  }
  return normalized;
}

function redactAttributes(
  value: Readonly<Record<string, unknown>> | undefined,
): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const safe: Record<string, string | number | boolean> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (
      !SAFE_ATTRIBUTE_KEYS.has(key) ||
      SENSITIVE_KEY_PATTERN.test(key) ||
      (typeof rawValue !== 'string' &&
        typeof rawValue !== 'number' &&
        typeof rawValue !== 'boolean')
    ) {
      continue;
    }
    if (
      typeof rawValue === 'number' &&
      (!Number.isFinite(rawValue) || Math.abs(rawValue) > 1_000_000_000)
    ) {
      continue;
    }
    if (typeof rawValue === 'string') {
      if (rawValue.length > 128 || !SAFE_TOKEN_PATTERN.test(rawValue)) continue;
    }
    if (Object.keys(safe).length >= 16) break;
    safe[key] = rawValue;
  }
  return safe;
}

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  append(
    input: Omit<
      AuditEntry,
      'action' | 'target' | 'correlationId' | 'attributes'
    > & {
      action: string;
      target: string;
      correlationId: string;
      attributes?: Readonly<Record<string, unknown>>;
    },
  ) {
    return this.repository.append(this.prepare(input));
  }

  appendWithTransaction(
    client: Prisma.TransactionClient,
    input: Omit<
      AuditEntry,
      'action' | 'target' | 'correlationId' | 'attributes'
    > & {
      action: string;
      target: string;
      correlationId: string;
      attributes?: Readonly<Record<string, unknown>>;
    },
  ) {
    return this.repository.appendWithClient(client, this.prepare(input));
  }

  private prepare(
    input: Omit<
      AuditEntry,
      'action' | 'target' | 'correlationId' | 'attributes'
    > & {
      action: string;
      target: string;
      correlationId: string;
      attributes?: Readonly<Record<string, unknown>>;
    },
  ): AuditEntry {
    const entry: AuditEntry = {
      ...(input.actorUserId
        ? { actorUserId: boundedText(input.actorUserId, 191, 'actor') }
        : {}),
      action: boundedText(input.action, 80, 'action'),
      target: boundedText(input.target, 160, 'target'),
      policyResult: input.policyResult,
      correlationId: boundedText(
        input.correlationId,
        128,
        'correlation',
        CORRELATION_PATTERN,
      ),
      attributes: redactAttributes(input.attributes),
    };
    if (entry.policyResult !== 'ALLOW' && entry.policyResult !== 'DENY') {
      throw new Error('Invalid audit policy result.');
    }
    return entry;
  }
}

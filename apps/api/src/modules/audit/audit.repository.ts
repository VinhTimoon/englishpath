import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditPolicyResult = 'ALLOW' | 'DENY';

export type AuditEntry = Readonly<{
  actorUserId?: string;
  action: string;
  target: string;
  policyResult: AuditPolicyResult;
  correlationId: string;
  attributes: Readonly<Record<string, string | number | boolean>>;
}>;

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(entry: AuditEntry) {
    return this.appendWithClient(this.prisma, entry);
  }

  appendWithClient(client: Prisma.TransactionClient, entry: AuditEntry) {
    return client.privilegedAuditEvent.create({
      data: {
        id: randomUUID(),
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        target: entry.target,
        policyResult: entry.policyResult,
        correlationId: entry.correlationId,
        attributes: entry.attributes,
      },
    });
  }
}

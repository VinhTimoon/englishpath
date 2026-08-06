jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('redacts unapproved attributes before persistence', async () => {
    const repository = {
      append: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuditService(repository as unknown as AuditRepository);

    await service.append({
      actorUserId: 'user-001',
      action: 'admin.overview.read',
      target: 'admin.overview',
      policyResult: 'ALLOW',
      correlationId: 'corr-admin-001',
      attributes: {
        role: 'ADMIN',
        capability: 'editor_shell',
        token: 'secret-token',
        nested: { private: true },
      },
    });

    expect(repository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { role: 'ADMIN', capability: 'editor_shell' },
      }),
    );
    const calls = repository.append.mock.calls as unknown[][];
    expect(JSON.stringify(calls[0]?.[0])).not.toMatch(/secret-token|private/i);
  });

  it('rejects unbounded actor and correlation identifiers', () => {
    const repository = { append: jest.fn() };
    const service = new AuditService(repository as unknown as AuditRepository);

    expect(() =>
      service.append({
        actorUserId: 'invalid actor',
        action: 'admin.overview.read',
        target: 'admin.overview',
        policyResult: 'DENY',
        correlationId: 'corr-admin-001',
      }),
    ).toThrow('Invalid audit actor');

    expect(() =>
      service.append({
        actorUserId: 'user-001',
        action: 'admin.overview.read',
        target: 'admin.overview',
        policyResult: 'DENY',
        correlationId: 'x'.repeat(129),
      }),
    ).toThrow('Invalid audit correlation');
  });
});

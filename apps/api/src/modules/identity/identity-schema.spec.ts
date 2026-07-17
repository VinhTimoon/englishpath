import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('identity schema migration', () => {
  const schema = readFileSync(
    join(process.cwd(), 'prisma/schema.prisma'),
    'utf8',
  );
  const migration = readFileSync(
    join(
      process.cwd(),
      'prisma/migrations/20260717113000_identity_schema/migration.sql',
    ),
    'utf8',
  );

  it('enforces provider identity, profile, role, and assignment uniqueness', () => {
    expect(schema).toContain('@@unique([authProvider, externalSubject])');
    expect(schema).toContain('model UserProfile');
    expect(schema).toContain('userId      String   @id');
    expect(schema).toContain('code        RoleCode   @unique');
    expect(schema).toContain('@@id([userId, roleId])');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "User_authProvider_externalSubject_key"',
    );
    expect(migration).toContain('CONSTRAINT "UserProfile_pkey"');
    expect(migration).toContain('CONSTRAINT "UserRole_pkey"');
    for (const foreignKey of [
      'UserProfile_userId_fkey',
      'UserRole_userId_fkey',
      'UserRole_roleId_fkey',
      'UserRole_assignedByUserId_fkey',
    ]) {
      expect(migration).toContain(`CONSTRAINT "${foreignKey}"`);
    }
    expect(migration).toContain('CREATE INDEX "User_status_idx"');
    expect(migration).toContain('CREATE INDEX "UserRole_roleId_idx"');
    expect(migration).toContain('CREATE INDEX "UserRole_assignedByUserId_idx"');
  });

  it('persists only application roles and seeds the canonical catalog', () => {
    const roleEnum = schema.match(/enum RoleCode \{[\s\S]*?\}/)?.[0] ?? '';
    expect(roleEnum).not.toContain('GUEST');
    for (const role of [
      'FREE_USER',
      'PREMIUM_USER',
      'CONTENT_EDITOR',
      'ADMIN',
      'SUPER_ADMIN',
    ]) {
      expect(roleEnum).toContain(role);
      expect(migration).toContain(`'${role}'`);
    }
  });

  it('is additive and documents a manual rollback without destructive SQL', () => {
    expect(migration).toContain('This migration is additive');
    expect(migration).toContain('Rollback notes');
    expect(migration).not.toMatch(/DROP\s+(?:TABLE|COLUMN|TYPE|INDEX)/);
    expect(migration).not.toMatch(/DELETE\s+FROM/);
    expect(migration).not.toMatch(/ALTER\s+COLUMN/);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const schema = readFileSync(
  join(__dirname, '..', 'prisma', 'schema.prisma'),
  'utf8',
);
const migration = readFileSync(
  join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20260809160000_library_content_foundation',
    'migration.sql',
  ),
  'utf8',
);

describe('EP3-ST001 library schema foundation', () => {
  it('keeps source evidence separate and governance deny-by-default', () => {
    expect(schema).toContain('model LibrarySourceManifest');
    expect(schema).toContain('model LibraryContentVersion');
    expect(schema).toContain('@default(DRAFT)');
    expect(schema).toContain('@default(UNPUBLISHED)');
    expect(schema).toContain('@default(PENDING)');
    expect(schema).toContain(
      '@@unique([contentId, sourceChecksum, sourceVersion])',
    );
    expect(schema).toContain(
      '@@unique([provider, sourceFileId, sourceChecksum, sourceVersion])',
    );
    expect(schema).toContain(
      '@@index([provider, sourceFileId, inventoriedAt])',
    );
    expect(schema).not.toContain('@@unique([provider, sourceFileId])');
    expect(schema).toContain('onDelete: Restrict');
  });

  it('contains additive migration SQL only', () => {
    expect(migration).not.toMatch(/^\s*(DROP|DELETE|TRUNCATE)\b/im);
    expect(migration).toContain('CREATE TABLE "LibraryContent"');
    expect(migration).toContain(
      'CREATE INDEX "LibrarySourceManifest_provider_sourceFileId_inventoriedAt"',
    );
    expect(migration).not.toContain(
      'LibrarySourceManifest_provider_sourceFileId_key',
    );
  });
});

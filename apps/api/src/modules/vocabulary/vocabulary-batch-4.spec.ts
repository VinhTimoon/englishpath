import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationRoot = resolve(process.cwd(), 'prisma/migrations');
const priorMigrations = [
  '20260806160000_reviewed_vocabulary_batch_1/migration.sql',
  '20260806170000_reviewed_vocabulary_batch_2/migration.sql',
  '20260806180000_reviewed_vocabulary_batch_3/migration.sql',
].map((file) => readFileSync(resolve(migrationRoot, file), 'utf8'));
const batch = readFileSync(
  resolve(
    migrationRoot,
    '20260806190000_reviewed_vocabulary_batch_4/migration.sql',
  ),
  'utf8',
);

function wordsFor(sql: string, prefix: string) {
  return [
    ...sql.matchAll(
      new RegExp(
        `^\\s*\\('vocab-${prefix}-(\\d{3})', '([^']+)', '([^']+)'`,
        'gm',
      ),
    ),
  ];
}

describe('reviewed vocabulary batch 4 fixture', () => {
  it('contains 100 new stable rows with governed provenance', () => {
    const rows = wordsFor(batch, 'b4');
    const priorWords = new Set(
      priorMigrations.flatMap((sql) => {
        const direct = [
          ...sql.matchAll(/^\('vocab-b1-\d{3}', '[^']+', '([^']+)'/gm),
        ];
        const values = [
          ...sql.matchAll(/^\s*\('vocab-b[23]-\d{3}', '[^']+', '([^']+)'/gm),
        ];
        return [...direct, ...values].map(([, word]) => word);
      }),
    );
    const words = rows.map(([, , , word]) => word);

    expect(rows).toHaveLength(100);
    expect(rows.map(([, id]) => id)).toEqual(
      Array.from({ length: 100 }, (_, index) =>
        String(index + 1).padStart(3, '0'),
      ),
    );
    expect(new Set(words).size).toBe(100);
    expect(words.some((word) => priorWords.has(word))).toBe(false);
    expect(new Set(rows.map(([, , taxonomyNodeId]) => taxonomyNodeId))).toEqual(
      new Set([
        'daily-life-travel',
        'professional-technology',
        'workplace-meetings',
      ]),
    );
    expect(batch).toContain('\'EnglishPath original batch 4 \' || batch."id"');
    expect(batch.match(/'CC0-1\.0'/g)).toHaveLength(1);
    expect(batch.match(/'REVIEWED'/g)).toHaveLength(1);
    expect(batch.match(/'PUBLISHED'/g)).toHaveLength(1);
  });
});

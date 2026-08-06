import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'prisma/migrations');
const prior = [
  '20260806160000_reviewed_vocabulary_batch_1/migration.sql',
  '20260806170000_reviewed_vocabulary_batch_2/migration.sql',
  '20260806180000_reviewed_vocabulary_batch_3/migration.sql',
  '20260806190000_reviewed_vocabulary_batch_4/migration.sql',
].map((file) => readFileSync(resolve(root, file), 'utf8'));
const batch = readFileSync(
  resolve(root, '20260806200000_reviewed_vocabulary_batch_5/migration.sql'),
  'utf8',
);

function rowsFor(sql: string) {
  return [...sql.matchAll(/^\s*\('vocab-b5-(\d{3})', '([^']+)', '([^']+)'/gm)];
}

describe('reviewed vocabulary batch 5 fixture', () => {
  it('contains 100 new stable rows with governed provenance', () => {
    const rows = rowsFor(batch);
    const priorWords = new Set(
      prior.flatMap((sql) =>
        [
          ...sql.matchAll(/^\s*\('vocab-b[1-4]-\d{3}', '[^']+', '([^']+)'/gm),
        ].map(([, word]) => word),
      ),
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
    expect(batch).toContain('\'EnglishPath original batch 5 \' || batch."id"');
    expect(batch.match(/'CC0-1\.0'/g)).toHaveLength(1);
    expect(batch.match(/'REVIEWED'/g)).toHaveLength(1);
    expect(batch.match(/'PUBLISHED'/g)).toHaveLength(1);
  });
});

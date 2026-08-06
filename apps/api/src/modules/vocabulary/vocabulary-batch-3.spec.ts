import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationRoot = resolve(process.cwd(), 'prisma/migrations');
const batchOne = readFileSync(
  resolve(
    migrationRoot,
    '20260806160000_reviewed_vocabulary_batch_1/migration.sql',
  ),
  'utf8',
);
const batchTwo = readFileSync(
  resolve(
    migrationRoot,
    '20260806170000_reviewed_vocabulary_batch_2/migration.sql',
  ),
  'utf8',
);
const batchThree = readFileSync(
  resolve(
    migrationRoot,
    '20260806180000_reviewed_vocabulary_batch_3/migration.sql',
  ),
  'utf8',
);

function rowsFor(sql: string) {
  return [...sql.matchAll(/^\s*\('vocab-b3-(\d{3})', '([^']+)', '([^']+)'/gm)];
}

describe('reviewed vocabulary batch 3 fixture', () => {
  it('contains 100 new stable rows with governed provenance', () => {
    const rows = rowsFor(batchThree);
    const priorWords = new Set([
      ...[
        ...batchOne.matchAll(/^\('vocab-b1-\d{3}', '[^']+', '([^']+)'/gm),
      ].map(([, word]) => word),
      ...[
        ...batchTwo.matchAll(/^\s*\('vocab-b2-\d{3}', '[^']+', '([^']+)'/gm),
      ].map(([, word]) => word),
      'agenda',
      'clarify',
      'deadline',
      'follow-up',
      'proposal',
    ]);
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
    expect(batchThree).toContain(
      '\'EnglishPath original batch 3 \' || batch."id"',
    );
    expect(batchThree.match(/'CC0-1\.0'/g)).toHaveLength(1);
    expect(batchThree.match(/'REVIEWED'/g)).toHaveLength(1);
    expect(batchThree.match(/'PUBLISHED'/g)).toHaveLength(1);
  });
});

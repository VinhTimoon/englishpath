import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const batchOnePath = resolve(
  process.cwd(),
  'prisma/migrations/20260806160000_reviewed_vocabulary_batch_1/migration.sql',
);
const batchTwoPath = resolve(
  process.cwd(),
  'prisma/migrations/20260806170000_reviewed_vocabulary_batch_2/migration.sql',
);

function rowsFor(sql: string, prefix: 'b1' | 'b2') {
  return [
    ...sql.matchAll(
      new RegExp(
        `^\\s*\\('vocab-${prefix}-(\\d{3})', '([^']+)', '([^']+)'`,
        'gm',
      ),
    ),
  ];
}

describe('reviewed vocabulary batch 2 fixture', () => {
  it('contains 100 new stable rows with governed provenance', () => {
    const batchOne = readFileSync(batchOnePath, 'utf8');
    const batchTwo = readFileSync(batchTwoPath, 'utf8');
    const rows = rowsFor(batchTwo, 'b2');
    const priorWords = new Set([
      ...rowsFor(batchOne, 'b1').map(([, , word]) => word),
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
    expect(batchTwo).toContain(
      '\'EnglishPath original batch 2 \' || batch."id"',
    );
    expect(batchTwo.match(/'CC0-1\.0'/g)).toHaveLength(1);
    expect(batchTwo.match(/'REVIEWED'/g)).toHaveLength(1);
    expect(batchTwo.match(/'PUBLISHED'/g)).toHaveLength(1);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260806160000_reviewed_vocabulary_batch_1/migration.sql',
);

describe('reviewed vocabulary batch 1 fixture', () => {
  it('contains exactly 100 stable, original, published rows across approved nodes', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const rows = [
      ...sql.matchAll(/^\('vocab-b1-(\d{3})', '([^']+)', '([^']+)'/gm),
    ];

    expect(rows).toHaveLength(100);
    expect(rows.map(([, id]) => id)).toEqual(
      Array.from({ length: 100 }, (_, index) =>
        String(index + 1).padStart(3, '0'),
      ),
    );
    expect(new Set(rows.map(([, , , word]) => word)).size).toBe(100);
    expect(new Set(rows.map(([, , taxonomyNodeId]) => taxonomyNodeId))).toEqual(
      new Set([
        'workplace-meetings',
        'workplace-meetings-scheduling',
        'daily-life-travel',
        'professional-technology',
      ]),
    );
    expect(
      sql.match(/'EnglishPath original batch 1 item \d{3}'/g),
    ).toHaveLength(100);
    expect(sql.match(/'CC0-1\.0'/g)).toHaveLength(100);
    expect(sql.match(/'REVIEWED'/g)).toHaveLength(100);
    expect(sql.match(/'PUBLISHED'/g)).toHaveLength(100);
    expect(sql).not.toMatch(
      /'agenda'|'clarify'|'deadline'|'follow-up'|'proposal'/,
    );
  });
});

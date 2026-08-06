import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260720120000_daily_sentence/migration.sql',
);

describe('reviewed daily-sentence seed baseline', () => {
  it('contains exactly twenty stable governed EnglishPath fixtures', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const rows = [
      ...sql.matchAll(
        /^\('ds-(\d{3})','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'/gm,
      ),
    ];

    expect(rows).toHaveLength(20);
    expect(rows.map(([, id]) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) =>
        String(index + 1).padStart(3, '0'),
      ),
    );
    expect(new Set(rows.map(([, id]) => id)).size).toBe(20);
    expect(rows.every(([, , prompt, answer]) => prompt && answer)).toBe(true);
    expect(sql.match(/'EnglishPath original fixture \d{3}'/g)).toHaveLength(20);
    expect(sql.match(/'CC0-1\.0'/g)).toHaveLength(20);
    expect(sql.match(/'REVIEWED'/g)).toHaveLength(20);
    expect(sql.match(/'PUBLISHED'/g)).toHaveLength(20);
  });
});

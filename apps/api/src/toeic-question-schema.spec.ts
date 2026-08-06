import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  join(
    root,
    'prisma/migrations/20260806210000_toeic_question_governance/migration.sql',
  ),
  'utf8',
);

describe('TOEIC question governance schema', () => {
  it('represents all seven TOEIC parts and closed governance domains', () => {
    expect(schema).toMatch(/enum ToeicPart[\s\S]*PART_1[\s\S]*PART_7/);
    expect(schema).toMatch(/enum ToeicQuestionType/);
    expect(schema).toMatch(/enum ToeicLicenseStatus/);
    expect(schema).toMatch(/enum ToeicReviewStatus/);
    expect(schema).toMatch(/enum ToeicPublicationState/);
  });

  it('keeps answer, provenance, rights, and review evidence on the version model', () => {
    expect(schema).toMatch(
      /model ToeicQuestionVersion[\s\S]*correctAnswer\s+String/,
    );
    expect(schema).toMatch(
      /sourceIdentity[\s\S]*sourceUrl[\s\S]*checksum[\s\S]*rightsOwner/,
    );
    expect(schema).toMatch(
      /reviewEvidence[\s\S]*reviewerIdentity[\s\S]*reviewedAt/,
    );
    expect(schema).toMatch(/model ToeicQuestionVersion[\s\S]*correctAnswer/);
  });

  it('enforces stable version and import identities with lifecycle indexes', () => {
    expect(schema).toMatch(/@@unique\(\[questionId, version\]\)/);
    expect(schema).toMatch(
      /@@unique\(\[sourceIdentity, checksum, sourceVersion\]\)/,
    );
    expect(schema).toMatch(/@@unique\(\[importIdentity\]\)/);
    expect(schema).toMatch(
      /@@index\(\[reviewStatus, publicationState, publishedAt, validUntil\]\)/,
    );
    expect(schema).toMatch(/onDelete: Cascade/);
    expect(schema).toMatch(/onDelete: Restrict/);
  });

  it('contains only additive executable migration SQL', () => {
    const executable = migration.replace(/--.*$/gm, '');
    expect(executable).not.toMatch(/^\s*(DROP|DELETE|TRUNCATE)\b/im);
    expect(executable).not.toMatch(
      /^\s*ALTER\s+TABLE[\s\S]*?\b(RENAME|DROP|ALTER)\b/im,
    );
    expect(executable).toMatch(/CREATE TABLE "ToeicQuestion"/);
    expect(executable).toMatch(/CREATE TABLE "ToeicQuestionVersion"/);
  });
});

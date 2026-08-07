import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TimedPrivateQuestion } from './toeic-timed-test.models';
import { selectNewestByCanonical } from './toeic-timed-test.selection';

const repositorySource = readFileSync(
  join(process.cwd(), 'src/modules/toeic/toeic-timed-test.repository.ts'),
  'utf8',
);
const migrationSource = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260807090000_toeic_timed_test_sessions/migration.sql',
  ),
  'utf8',
);
const normalizedRepositorySource = repositorySource.replace(/\r\n/g, '\n');

describe('TOEIC timed-test repository boundary', () => {
  it('keeps only the first deterministic newest version per canonical question', () => {
    const makeQuestion = (id: string, questionId: string) =>
      ({ id, questionId }) as TimedPrivateQuestion;
    expect(
      selectNewestByCanonical([
        makeQuestion('new-version', 'canonical-1'),
        makeQuestion('old-version', 'canonical-1'),
        makeQuestion('other-version', 'canonical-2'),
      ]).map((question) => question.id),
    ).toEqual(['new-version', 'other-version']);
  });

  it('keeps mock-test selection and private grading fields behind separate selects', () => {
    expect(repositorySource).toContain("usageScope: 'MOCK_TEST'");
    expect(repositorySource).toContain("accessTier: 'FREE'");
    expect(repositorySource).toContain('const QUESTION_FIELDS');
    expect(repositorySource).toContain('const PRIVATE_QUESTION_SELECT');
    expect(repositorySource).toContain('correctAnswer: true');
    expect(repositorySource).toContain('where: { id: { in: [...ids] } }');
    expect(repositorySource).toContain('async finalizedQuestionsByIds');
    expect(repositorySource).toContain('select: PRIVATE_QUESTION_SELECT');
  });

  it('uses owner/session uniqueness, deadline locking, and compare-and-set finalization', () => {
    expect(repositorySource).toContain('userId_clientSessionId');
    expect(repositorySource).toContain('sessionId_questionId');
    expect(repositorySource).toContain("status: 'ACTIVE'");
    expect(repositorySource).toContain('deadlineAt: { gt: input.answeredAt }');
    expect(repositorySource).toContain('finalizedAt: null');
    expect(repositorySource).toContain('updated.count !== 1');
    expect(normalizedRepositorySource).toContain(
      "where: { id, userId, status: 'ACTIVE' }",
    );
    expect(normalizedRepositorySource).toContain(
      'Acquire the same active-session row lock used by answer insertion',
    );
    expect(normalizedRepositorySource).toContain(
      'const raced = await transaction.toeicTimedTestAnswer.findUnique',
    );
    expect(normalizedRepositorySource).toContain(
      "? 'replayed'\n            : 'conflict'",
    );
  });

  it('keeps the migration additive and constrained', () => {
    expect(migrationSource).toContain('CREATE TABLE "ToeicTimedTestSession"');
    expect(migrationSource).toContain('CREATE TABLE "ToeicTimedTestAnswer"');
    expect(migrationSource).toContain('ON DELETE CASCADE');
    expect(migrationSource).toContain(
      'ToeicTimedTestSession_userId_clientSessionId_key',
    );
    expect(migrationSource).toContain(
      'ToeicTimedTestAnswer_sessionId_questionId_key',
    );
    expect(migrationSource).not.toMatch(/\bDROP\s+(TABLE|TYPE|INDEX)\b/i);
  });
});

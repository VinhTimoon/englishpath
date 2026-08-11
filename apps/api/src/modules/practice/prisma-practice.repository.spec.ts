import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaPracticeRepository } from './prisma-practice.repository';

const input = {
  userId: 'learner-1',
  sessionId: 'timed-1',
  answers: [
    { questionId: 'version-1', selectedOption: 'A', isCorrect: true },
    { questionId: 'version-2', selectedOption: 'B', isCorrect: false },
  ],
  questions: [
    {
      questionId: 'version-1',
      prompt: 'Correct',
      correctOption: 'A',
      explanation: 'Good.',
    },
    {
      questionId: 'version-2',
      prompt: 'Review',
      correctOption: 'A',
      explanation: 'Review this rule.',
    },
  ],
} as const;

type UpsertPayload = {
  where: { toeicTimedTestSessionId_questionId: Record<string, string> };
  create: Record<string, string>;
};

describe('PrismaPracticeRepository Error Notebook integration', () => {
  it('captures only incorrect TOEIC answers with stable owner-scoped uniqueness', async () => {
    const upsert = jest
      .fn<Promise<{ id: string }>, [UpsertPayload]>()
      .mockResolvedValue({ id: 'entry-1' });
    const findFirst = jest.fn().mockResolvedValue({ id: 'timed-1' });
    const tx = {
      toeicTimedTestSession: { findFirst },
      errorNotebookEntry: {
        upsert,
        findUnique: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new PrismaPracticeRepository(prisma as never);

    await expect(repository.captureToeicErrors(input)).resolves.toBe(1);
    await expect(repository.captureToeicErrors(input)).resolves.toBe(1);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'timed-1',
        userId: 'learner-1',
        status: { in: ['SUBMITTED', 'EXPIRED'] },
      },
      select: { id: true },
    });
    const calls = (upsert as unknown as { mock: { calls: [UpsertPayload][] } })
      .mock.calls;
    const call = calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call.where).toEqual({
      toeicTimedTestSessionId_questionId: {
        toeicTimedTestSessionId: 'timed-1',
        questionId: 'version-2',
      },
    });
    expect(call.create).toMatchObject({
      userId: 'learner-1',
      source: 'TOEIC_TIMED_TEST',
      correctOption: 'A',
      selectedOption: 'B',
    });
    expect(JSON.stringify(upsert.mock.calls)).not.toContain('version-1');
  });

  it('replays an idempotent uniqueness race only for the same owner/source', async () => {
    const upsert = jest
      .fn<Promise<{ id: string }>, [UpsertPayload]>()
      .mockRejectedValue({ code: 'P2002' });
    const findUnique = jest
      .fn()
      .mockResolvedValue({ userId: 'learner-1', source: 'TOEIC_TIMED_TEST' });
    const tx = {
      toeicTimedTestSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 'timed-1' }),
      },
      errorNotebookEntry: { upsert, findUnique },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new PrismaPracticeRepository(prisma as never);

    await expect(repository.captureToeicErrors(input)).resolves.toBe(1);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('does not write when the finalized session is absent or owned by another learner', async () => {
    const upsert = jest.fn();
    const tx = {
      toeicTimedTestSession: { findFirst: jest.fn().mockResolvedValue(null) },
      errorNotebookEntry: { upsert, findUnique: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new PrismaPracticeRepository(prisma as never);

    await expect(repository.captureToeicErrors(input)).resolves.toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns a bounded owner-scoped source-filtered page', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const findMany = jest.fn().mockResolvedValue([
      {
        questionId: 'version-2',
        prompt: 'Review',
        selectedOption: 'B',
        correctOption: 'A',
        explanation: 'Review this rule.',
        source: 'TOEIC_TIMED_TEST',
      },
    ]);
    const prisma = {
      errorNotebookEntry: { count, findMany },
    };
    const repository = new PrismaPracticeRepository(prisma as never);

    const page = await repository.errors('learner-1', {
      page: 2,
      size: 1,
      source: 'TOEIC_TIMED_TEST',
    });

    expect(count).toHaveBeenCalledWith({
      where: { userId: 'learner-1', source: 'TOEIC_TIMED_TEST' },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'learner-1', source: 'TOEIC_TIMED_TEST' },
        skip: 1,
        take: 1,
      }),
    );
    expect(page.pagination).toEqual({
      page: 2,
      size: 1,
      total: 2,
      hasNext: false,
    });
    expect(page.entries[0]).toMatchObject({
      source: 'TOEIC_TIMED_TEST',
      remediation: { href: '/error-notebook', label: 'Ôn lỗi TOEIC' },
    });
  });

  it('keeps legacy daily-practice notebook reads source-safe', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        questionId: 'practice-1',
        prompt: 'Daily prompt',
        selectedOption: 'B',
        correctOption: 'A',
        explanation: 'Daily explanation.',
        source: 'PRACTICE',
      },
    ]);
    const prisma = {
      errorNotebookEntry: {
        count: jest.fn().mockResolvedValue(1),
        findMany,
      },
    };
    const repository = new PrismaPracticeRepository(prisma as never);

    const page = await repository.errors('learner-1', { page: 1, size: 20 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'learner-1' } }),
    );
    expect(page.entries[0]).toMatchObject({
      source: 'PRACTICE',
      remediation: { label: 'Xem lại lỗi' },
    });
  });

  it('derives owner-scoped coverage independently of the source filter and fails closed on malformed TOEIC metadata', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const prisma = {
      errorNotebookEntry: { count: jest.fn().mockResolvedValue(0), findMany },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          generalEntries: 1,
          invalidToeicEntries: 1,
          listeningEntries: 0,
          readingEntries: 0,
        },
      ]),
    };
    const page = await new PrismaPracticeRepository(prisma as never).errors(
      'learner-1',
      { page: 1, size: 20, source: 'PRACTICE' },
    );
    expect(page.coverage.domains).toEqual([
      { domain: 'GENERAL', state: 'available', entryCount: 1 },
      { domain: 'LISTENING', state: 'unavailable', entryCount: 0 },
      { domain: 'READING', state: 'unavailable', entryCount: 0 },
      { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
      { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('maps valid TOEIC Parts and counts persisted rows without deduplication', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const prisma = {
      errorNotebookEntry: { count: jest.fn().mockResolvedValue(0), findMany },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          generalEntries: 0,
          invalidToeicEntries: 0,
          listeningEntries: 1,
          readingEntries: 2,
        },
      ]),
    };

    const page = await new PrismaPracticeRepository(prisma as never).errors(
      'learner-1',
      { page: 1, size: 20, source: 'PRACTICE' },
    );

    expect(page.coverage.domains).toEqual([
      { domain: 'GENERAL', state: 'empty', entryCount: 0 },
      { domain: 'LISTENING', state: 'available', entryCount: 1 },
      { domain: 'READING', state: 'available', entryCount: 2 },
      { domain: 'SPEAKING', state: 'unavailable', entryCount: 0 },
      { domain: 'WRITING', state: 'unavailable', entryCount: 0 },
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('keeps the migration additive and enforces source/reference consistency', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20260807120000_toeic_error_notebook_ownership/migration.sql',
      ),
      'utf8',
    );
    expect(migration).toContain('ErrorNotebookSource');
    expect(migration).toContain(
      'ErrorNotebookEntry_toeicTimedTestSessionId_questionId_key',
    );
    expect(migration).toContain('ErrorNotebookEntry_source_reference_check');
    expect(migration).toContain('ALTER COLUMN "sessionId" DROP NOT NULL');
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|TYPE|INDEX)\b/i);
  });
});

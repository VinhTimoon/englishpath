import { ToeicPart } from '../../../generated/prisma/enums';
import { selectNewestByCanonical } from '../toeic-timed-test.selection';
import {
  FULL_MOCK_POLICY,
  validateFullMockPolicy,
  type FullMockPolicy,
} from './full-mock-test.policy';
import type { TimedPrivateQuestion } from '../toeic-timed-test.models';

export type FullMockPrivateQuestion = Readonly<{
  canonicalQuestionId: string;
  versionId: string;
  version: number;
  part: ToeicPart;
}>;
export type FullMockPartCounts = Readonly<Record<ToeicPart, number>>;
export type FullMockAssembly = Readonly<{
  blueprintVersion: string;
  total: number;
  durationSeconds: number;
  selectedVersionIds: readonly string[];
  partCounts: FullMockPartCounts;
}>;
export type FullMockAssemblyResult =
  | Readonly<{ ok: true; assembly: FullMockAssembly }>
  | Readonly<{
      ok: false;
      code: 'INSUFFICIENT_CATALOGUE' | 'MALFORMED_CATALOGUE';
      missingByPart?: Readonly<Partial<Record<ToeicPart, number>>>;
      reason?: string;
    }>;

function malformed(reason: string): FullMockAssemblyResult {
  return Object.freeze({ ok: false, code: 'MALFORMED_CATALOGUE', reason });
}

export function assembleFullMockTest(
  input: readonly FullMockPrivateQuestion[],
  policy: FullMockPolicy = FULL_MOCK_POLICY,
): FullMockAssemblyResult {
  try {
    validateFullMockPolicy(policy);
  } catch (error) {
    return malformed((error as Error).message);
  }
  const identities = new Set<string>();
  const parts = new Map<string, ToeicPart>();
  for (const question of input) {
    if (
      !question.canonicalQuestionId ||
      !question.versionId ||
      !Number.isInteger(question.version) ||
      question.version <= 0 ||
      !Object.values(ToeicPart).includes(question.part)
    )
      return malformed('Catalogue contains an invalid private question.');
    const identity = `${question.canonicalQuestionId}\u0000${question.versionId}`;
    if (identities.has(identity))
      return malformed(
        'Catalogue contains a duplicate canonical/version identity.',
      );
    identities.add(identity);
    const priorPart = parts.get(question.canonicalQuestionId);
    if (priorPart && priorPart !== question.part)
      return malformed('Canonical question versions cross Parts.');
    parts.set(question.canonicalQuestionId, question.part);
  }
  const ordered = [...input].sort(
    (a, b) =>
      a.part.localeCompare(b.part) ||
      a.canonicalQuestionId.localeCompare(b.canonicalQuestionId) ||
      b.version - a.version ||
      a.versionId.localeCompare(b.versionId),
  );
  const newest = selectNewestByCanonical(
    ordered.map(
      (q) =>
        ({
          ...q,
          questionId: q.canonicalQuestionId,
        }) as unknown as TimedPrivateQuestion,
    ),
  ) as unknown as readonly FullMockPrivateQuestion[];
  const selected: string[] = [];
  const counts = {} as Record<ToeicPart, number>;
  const missing: Partial<Record<ToeicPart, number>> = {};
  for (const part of Object.values(ToeicPart)) {
    const candidates = newest
      .filter((q) => q.part === part)
      .sort(
        (a, b) =>
          a.canonicalQuestionId.localeCompare(b.canonicalQuestionId) ||
          b.version - a.version ||
          a.versionId.localeCompare(b.versionId),
      );
    const quota = policy.partQuotas[part];
    counts[part] = Math.min(candidates.length, quota);
    if (candidates.length < quota) missing[part] = quota - candidates.length;
    else selected.push(...candidates.slice(0, quota).map((q) => q.versionId));
  }
  if (Object.keys(missing).length)
    return Object.freeze({
      ok: false,
      code: 'INSUFFICIENT_CATALOGUE',
      missingByPart: Object.freeze(missing),
    });
  return Object.freeze({
    ok: true,
    assembly: Object.freeze({
      blueprintVersion: policy.version,
      total: policy.total,
      durationSeconds: policy.durationSeconds,
      selectedVersionIds: Object.freeze(selected),
      partCounts: Object.freeze(counts),
    }),
  });
}

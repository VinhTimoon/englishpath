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
  if (!Array.isArray(input))
    return malformed('Catalogue must be an array of private questions.');
  try {
    validateFullMockPolicy(policy);
  } catch (error) {
    return malformed((error as Error).message);
  }
  const identities = new Set<string>();
  const versionIds = new Set<string>();
  const parts = new Map<string, ToeicPart>();
  const validated: FullMockPrivateQuestion[] = [];
  for (const rawQuestion of input as readonly unknown[]) {
    if (typeof rawQuestion !== 'object' || rawQuestion === null)
      return malformed('Catalogue contains an invalid private question.');
    const question = rawQuestion as Partial<FullMockPrivateQuestion>;
    const canonicalQuestionId = question.canonicalQuestionId;
    const versionId = question.versionId;
    const version = question.version;
    const part = question.part;
    if (
      typeof canonicalQuestionId !== 'string' ||
      !canonicalQuestionId.trim() ||
      typeof versionId !== 'string' ||
      !versionId.trim() ||
      typeof version !== 'number' ||
      !Number.isInteger(version) ||
      version <= 0 ||
      typeof part !== 'string' ||
      !Object.values(ToeicPart).includes(part)
    )
      return malformed('Catalogue contains an invalid private question.');
    if (versionIds.has(versionId))
      return malformed('Catalogue contains a duplicate version identity.');
    const identity = `${canonicalQuestionId}\u0000${versionId}`;
    if (identities.has(identity))
      return malformed(
        'Catalogue contains a duplicate canonical/version identity.',
      );
    identities.add(identity);
    versionIds.add(versionId);
    const normalizedPart = part;
    const priorPart = parts.get(canonicalQuestionId);
    if (priorPart && priorPart !== normalizedPart)
      return malformed('Canonical question versions cross Parts.');
    parts.set(canonicalQuestionId, normalizedPart);
    validated.push({
      canonicalQuestionId,
      versionId,
      version,
      part: normalizedPart,
    });
  }
  const ordered = [...validated].sort(
    (a, b) =>
      a.part.localeCompare(b.part) ||
      a.canonicalQuestionId.localeCompare(b.canonicalQuestionId) ||
      b.version - a.version ||
      a.versionId.localeCompare(b.versionId),
  );
  const newest = selectNewestByCanonical(
    ordered.map((q) => ({
      ...q,
      questionId: q.canonicalQuestionId,
    })) as unknown as TimedPrivateQuestion[],
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

import type {
  RoadmapItemStatus,
  RoadmapItemView,
  RoadmapTaskType,
} from './roadmap.models';

export const FOUR_SKILLS = [
  'READING',
  'LISTENING',
  'SPEAKING',
  'WRITING',
] as const;
export type FourSkill = (typeof FOUR_SKILLS)[number];
export const FOUR_SKILLS_BALANCE_POLICY_VERSION = 'four-skills-balance-v1';

export type FourSkillsActivity = Readonly<{
  reference: string;
  skill: FourSkill;
  kind: RoadmapTaskType;
  target: number;
  source: 'ROADMAP' | 'TOEIC_TASK';
  published?: boolean;
  required?: boolean;
  due?: boolean;
  status?: RoadmapItemStatus;
}>;

export type FourSkillsEvidence = Readonly<{
  completedBySkill: Readonly<Record<FourSkill, number>>;
  targetPerDay: number;
  policyVersion?: string;
}>;

export type FourSkillsAllocation = Readonly<{
  skill: FourSkill;
  activity: FourSkillsActivity | null;
  target: number;
  reason: 'REQUIRED' | 'DUE' | 'UNDERREPRESENTED' | 'BALANCED' | 'UNAVAILABLE';
}>;

export type FourSkillsRecalculation = Readonly<{
  policyVersion: string;
  inputFingerprint: string;
  reason: 'INITIAL' | 'EVIDENCE_CHANGED' | 'POLICY_CHANGED' | 'UNCHANGED';
  allocations: readonly FourSkillsAllocation[];
}>;

export type LearnerSafeFourSkillsProjection = Readonly<{
  skill: FourSkill;
  activityKind: RoadmapTaskType | null;
  target: number | null;
  reference: string | null;
  allocationReason: FourSkillsAllocation['reason'];
  completionState: RoadmapItemStatus | 'UNAVAILABLE';
  availability: 'AVAILABLE' | 'UNAVAILABLE';
}>;

export class FourSkillsBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FourSkillsBalanceError';
  }
}

const skillSet = new Set<string>(FOUR_SKILLS);
const isSkill = (value: unknown): value is FourSkill =>
  typeof value === 'string' && skillSet.has(value);

/** Validates the one canonical four-skill metadata shape. */
export function validateFourSkillsMetadata(
  skills: readonly unknown[],
): readonly FourSkill[] {
  if (!Array.isArray(skills) || skills.length !== FOUR_SKILLS.length)
    throw new FourSkillsBalanceError('Exactly four skills are required.');
  const normalized = skills.map((skill) => {
    if (!isSkill(skill)) throw new FourSkillsBalanceError('Unknown skill.');
    return skill;
  });
  if (new Set(normalized).size !== normalized.length)
    throw new FourSkillsBalanceError('Duplicate skill metadata.');
  if (FOUR_SKILLS.some((skill) => !normalized.includes(skill)))
    throw new FourSkillsBalanceError('Contradictory skill metadata.');
  return FOUR_SKILLS;
}

function stableActivities(pool: readonly FourSkillsActivity[]) {
  const seen = new Set<string>();
  return [...pool]
    .filter((activity) => {
      if (
        !isSkill(activity.skill) ||
        !activity.reference ||
        seen.has(activity.reference) ||
        (activity.source !== 'ROADMAP' && activity.source !== 'TOEIC_TASK') ||
        ((activity.skill === 'SPEAKING' || activity.skill === 'WRITING') &&
          (activity.source !== 'TOEIC_TASK' || activity.published !== true)) ||
        ((activity.skill === 'READING' || activity.skill === 'LISTENING') &&
          activity.source === 'TOEIC_TASK' &&
          activity.published !== true)
      )
        return false;
      seen.add(activity.reference);
      return Number.isInteger(activity.target) && activity.target > 0;
    })
    .sort((a, b) => a.reference.localeCompare(b.reference));
}

/** Pure allocation: required/due work wins, then the least evidenced skill. */
export function allocateFourSkills(
  evidence: FourSkillsEvidence,
  pool: readonly FourSkillsActivity[],
): readonly FourSkillsAllocation[] {
  validateFourSkillsMetadata(Object.keys(evidence.completedBySkill));
  if (
    evidence.policyVersion !== undefined &&
    evidence.policyVersion !== FOUR_SKILLS_BALANCE_POLICY_VERSION
  )
    throw new FourSkillsBalanceError('Unsupported balance policy version.');
  if (!Number.isInteger(evidence.targetPerDay) || evidence.targetPerDay < 0)
    throw new FourSkillsBalanceError('Target must be a non-negative integer.');
  const activities = stableActivities(pool);
  const chosen: FourSkillsAllocation[] = [];
  const required = activities
    .filter((activity) => activity.required || activity.due)
    .sort(
      (a, b) =>
        Number(Boolean(b.required)) - Number(Boolean(a.required)) ||
        a.reference.localeCompare(b.reference),
    );
  for (const activity of required) {
    if (chosen.length >= evidence.targetPerDay) break;
    chosen.push({
      skill: activity.skill,
      activity,
      target: activity.target,
      reason: activity.required ? 'REQUIRED' : 'DUE',
    });
  }
  const available = FOUR_SKILLS.map((skill) => ({
    skill,
    count: evidence.completedBySkill[skill],
    activity: activities.find(
      (candidate) =>
        candidate.skill === skill &&
        !chosen.some(
          (item) => item.activity?.reference === candidate.reference,
        ),
    ),
  })).sort((a, b) => a.count - b.count || a.skill.localeCompare(b.skill));
  for (const candidate of available) {
    if (chosen.length >= evidence.targetPerDay) break;
    chosen.push({
      skill: candidate.skill,
      activity: candidate.activity ?? null,
      target: candidate.activity?.target ?? 0,
      reason: candidate.activity
        ? candidate.count < Math.min(...available.map((item) => item.count))
          ? 'UNDERREPRESENTED'
          : 'BALANCED'
        : 'UNAVAILABLE',
    });
  }
  return chosen;
}

function stableFingerprint(
  evidence: FourSkillsEvidence,
  pool: readonly FourSkillsActivity[],
) {
  const canonicalEvidence = FOUR_SKILLS.map((skill) => [
    skill,
    evidence.completedBySkill[skill],
  ]);
  const canonicalPool = stableActivities(pool).map((activity) => ({
    reference: activity.reference,
    skill: activity.skill,
    kind: activity.kind,
    target: activity.target,
    source: activity.source,
    published: activity.published ?? false,
    required: activity.required ?? false,
    due: activity.due ?? false,
    status: activity.status ?? 'PENDING',
  }));
  return JSON.stringify({
    policyVersion: FOUR_SKILLS_BALANCE_POLICY_VERSION,
    targetPerDay: evidence.targetPerDay,
    completedBySkill: canonicalEvidence,
    activities: canonicalPool,
  });
}

/** Pure version/recalculation boundary; persistence remains in the roadmap repository. */
export function recalculateFourSkills(
  evidence: FourSkillsEvidence,
  pool: readonly FourSkillsActivity[],
  previous?: Pick<
    FourSkillsRecalculation,
    'policyVersion' | 'inputFingerprint'
  >,
): FourSkillsRecalculation {
  const inputFingerprint = stableFingerprint(evidence, pool);
  const policyChanged =
    previous !== undefined &&
    previous.policyVersion !== FOUR_SKILLS_BALANCE_POLICY_VERSION;
  const unchanged =
    previous !== undefined &&
    previous.policyVersion === FOUR_SKILLS_BALANCE_POLICY_VERSION &&
    previous.inputFingerprint === inputFingerprint;
  return {
    policyVersion: FOUR_SKILLS_BALANCE_POLICY_VERSION,
    inputFingerprint,
    reason:
      previous === undefined
        ? 'INITIAL'
        : policyChanged
          ? 'POLICY_CHANGED'
          : unchanged
            ? 'UNCHANGED'
            : 'EVIDENCE_CHANGED',
    allocations: allocateFourSkills(evidence, pool),
  };
}

export function learnerSafeFourSkillsProjection(
  allocation: FourSkillsAllocation,
): LearnerSafeFourSkillsProjection {
  const available = allocation.activity !== null;
  return {
    skill: allocation.skill,
    activityKind: available ? allocation.activity.kind : null,
    target: available ? allocation.target : null,
    reference: available ? allocation.activity.reference : null,
    allocationReason: allocation.reason,
    completionState: available
      ? (allocation.activity.status ?? 'PENDING')
      : 'UNAVAILABLE',
    availability: available ? 'AVAILABLE' : 'UNAVAILABLE',
  };
}

function aggregateStatus(items: readonly RoadmapItemView[]): RoadmapItemStatus {
  if (items.every(({ status }) => status === 'COMPLETED')) return 'COMPLETED';
  if (items.every(({ status }) => status === 'SKIPPED')) return 'SKIPPED';
  return 'PENDING';
}

/**
 * Projects only the existing server-owned roadmap activity pool. Speaking and
 * Writing are intentionally unavailable until an approved TOEIC task
 * reference exists; a generic roadmap item is never promoted into that pool.
 */
export function projectRoadmapFourSkills(
  items: readonly RoadmapItemView[],
): readonly LearnerSafeFourSkillsProjection[] {
  return FOUR_SKILLS.map((skill) => {
    const skillItems =
      skill === 'READING' || skill === 'LISTENING'
        ? items.filter((item) => item.skill === skill)
        : [];
    const first = skillItems[0];
    if (!first) {
      return learnerSafeFourSkillsProjection({
        skill,
        activity: null,
        target: 0,
        reason: 'UNAVAILABLE',
      });
    }
    return learnerSafeFourSkillsProjection({
      skill,
      activity: {
        reference: first.id,
        skill,
        kind: first.taskType,
        target: skillItems.length,
        source: 'ROADMAP',
        status: aggregateStatus(skillItems),
      },
      target: skillItems.length,
      reason: 'BALANCED',
    });
  });
}

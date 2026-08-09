export const TOEIC_SPEAKING_WRITING_SKILLS = ['SPEAKING', 'WRITING'] as const;
export type SpeakingWritingSkill =
  (typeof TOEIC_SPEAKING_WRITING_SKILLS)[number];
export const TOEIC_TASK_TYPES = [
  'READ_ALOUD',
  'DESCRIBE_PICTURE',
  'RESPOND_TO_QUESTIONS',
  'RESPOND_USING_INFORMATION',
  'EXPRESS_AN_OPINION',
  'SENTENCE_BASED',
  'RESPOND_TO_A_REQUEST',
  'WRITE_AN_OPINION_ESSAY',
] as const;
export type ToeicSpeakingWritingTaskType = (typeof TOEIC_TASK_TYPES)[number];
export const TOEIC_PROMPT_KINDS = ['TEXT', 'IMAGE', 'TEXT_AND_IMAGE'] as const;
export type PromptKind = (typeof TOEIC_PROMPT_KINDS)[number];
export const TOEIC_RESPONSE_MODES = ['RECORDED_AUDIO', 'TEXT'] as const;
export type ResponseMode = (typeof TOEIC_RESPONSE_MODES)[number];
export const TOEIC_PUBLICATION_STATES = [
  'DRAFT',
  'REVIEWED',
  'PUBLISHED',
  'WITHDRAWN',
] as const;
export type PublicationState = (typeof TOEIC_PUBLICATION_STATES)[number];

export type DomainErrorCode =
  'INVALID_METADATA' | 'INVALID_LINEAGE' | 'NOT_PUBLISHED';
export class ToeicSpeakingWritingError extends Error {
  constructor(readonly code: DomainErrorCode) {
    super(code);
    this.name = 'ToeicSpeakingWritingError';
  }
}

type MediaReference = Readonly<{
  kind: 'IMAGE' | 'AUDIO';
  assetId: string;
  altText?: string;
}>;
export type TaskDefinitionInput = Readonly<{
  id: string;
  skill: SpeakingWritingSkill;
  taskType: ToeicSpeakingWritingTaskType;
  version: string;
  promptKind: PromptKind;
  responseMode: ResponseMode;
  instruction: string;
  prompt: string;
  durationSeconds?: number;
  minWords?: number;
  maxWords?: number;
  media?: readonly MediaReference[];
  publicationState: PublicationState;
  supersedesVersion?: string;
}>;
export type TaskVersion = Readonly<TaskDefinitionInput>;
export type LearnerTask = Readonly<
  Pick<
    TaskVersion,
    | 'id'
    | 'skill'
    | 'taskType'
    | 'version'
    | 'promptKind'
    | 'responseMode'
    | 'instruction'
    | 'prompt'
    | 'durationSeconds'
    | 'minWords'
    | 'maxWords'
    | 'media'
  >
>;

const has = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T => typeof value === 'string' && values.includes(value as T);
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+~-]{0,127}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const token = (value: unknown) =>
  typeof value === 'string' && TOKEN_PATTERN.test(value.trim());
const isMediaReference = (value: unknown): value is MediaReference =>
  isRecord(value) &&
  has(['IMAGE', 'AUDIO'] as const, value.kind) &&
  token(value.assetId) &&
  (value.altText === undefined || text(value.altText, 500));
const cloneFreeze = <T>(value: T): T => {
  if (Array.isArray(value)) return Object.freeze(value.map(cloneFreeze)) as T;
  if (value && typeof value === 'object')
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, cloneFreeze(v)]),
      ),
    ) as T;
  return value;
};
const fail = (code: DomainErrorCode): never => {
  throw new ToeicSpeakingWritingError(code);
};
export function createTaskVersion(input: TaskDefinitionInput): TaskVersion {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !has(TOEIC_SPEAKING_WRITING_SKILLS, input.skill) ||
    !has(TOEIC_TASK_TYPES, input.taskType) ||
    !has(TOEIC_PROMPT_KINDS, input.promptKind) ||
    !has(TOEIC_RESPONSE_MODES, input.responseMode) ||
    !has(TOEIC_PUBLICATION_STATES, input.publicationState)
  )
    fail('INVALID_METADATA');
  if (
    (input.skill === 'SPEAKING') !==
      [
        'READ_ALOUD',
        'DESCRIBE_PICTURE',
        'RESPOND_TO_QUESTIONS',
        'RESPOND_USING_INFORMATION',
        'EXPRESS_AN_OPINION',
      ].includes(input.taskType) ||
    (input.skill === 'WRITING') !==
      [
        'SENTENCE_BASED',
        'RESPOND_TO_A_REQUEST',
        'WRITE_AN_OPINION_ESSAY',
      ].includes(input.taskType)
  )
    fail('INVALID_METADATA');
  if (
    (input.responseMode === 'RECORDED_AUDIO' && input.skill !== 'SPEAKING') ||
    (input.responseMode === 'TEXT' && input.skill !== 'WRITING')
  )
    fail('INVALID_METADATA');
  if (
    input.promptKind === 'IMAGE' &&
    !input.media?.some((m) => isRecord(m) && m.kind === 'IMAGE')
  )
    fail('INVALID_METADATA');
  const media = input.media;
  if (
    media !== undefined &&
    (!Array.isArray(media) ||
      media.length > 8 ||
      media.some(
        (reference) =>
          !isMediaReference(reference) ||
          Object.keys(reference).some(
            (key) => !['kind', 'assetId', 'altText'].includes(key),
          ),
      ))
  )
    fail('INVALID_METADATA');
  if (
    input.promptKind === 'TEXT' &&
    media?.some(
      (reference) => isMediaReference(reference) && reference.kind === 'IMAGE',
    )
  )
    fail('INVALID_METADATA');
  if (
    input.promptKind === 'TEXT_AND_IMAGE' &&
    !media?.some(
      (reference) => isMediaReference(reference) && reference.kind === 'IMAGE',
    )
  )
    fail('INVALID_METADATA');
  if (
    !token(input.id) ||
    !token(input.version) ||
    !text(input.instruction, 2000) ||
    !text(input.prompt, 5000) ||
    (input.durationSeconds !== undefined &&
      (!Number.isInteger(input.durationSeconds) ||
        input.durationSeconds < 1 ||
        input.durationSeconds > 3600)) ||
    (input.minWords !== undefined &&
      (!Number.isInteger(input.minWords) ||
        input.minWords < 1 ||
        input.minWords > 10000)) ||
    (input.maxWords !== undefined &&
      (!Number.isInteger(input.maxWords) ||
        input.maxWords < (input.minWords ?? 1) ||
        input.maxWords > 10000)) ||
    (input.supersedesVersion !== undefined &&
      (!token(input.supersedesVersion) ||
        input.supersedesVersion.trim() === input.version.trim()))
  )
    fail('INVALID_METADATA');
  if (
    (input.skill === 'SPEAKING' && input.durationSeconds === undefined) ||
    (input.skill === 'WRITING' && input.maxWords === undefined)
  )
    fail('INVALID_METADATA');
  return cloneFreeze({
    ...input,
    id: input.id.trim(),
    version: input.version.trim(),
    instruction: input.instruction.trim(),
    prompt: input.prompt.trim(),
    ...(input.supersedesVersion
      ? { supersedesVersion: input.supersedesVersion.trim() }
      : {}),
    media: media ? [...media] : undefined,
  });
}
export function learnerTaskProjection(
  task: TaskVersion,
  nowState: 'PRE_SUBMISSION' = 'PRE_SUBMISSION',
): LearnerTask {
  if (nowState !== 'PRE_SUBMISSION' || task.publicationState !== 'PUBLISHED')
    fail('NOT_PUBLISHED');
  return cloneFreeze({
    id: task.id,
    skill: task.skill,
    taskType: task.taskType,
    version: task.version,
    promptKind: task.promptKind,
    responseMode: task.responseMode,
    instruction: task.instruction,
    prompt: task.prompt,
    durationSeconds: task.durationSeconds,
    minWords: task.minWords,
    maxWords: task.maxWords,
    media: task.media?.map(({ kind, assetId, altText }) => ({
      kind,
      assetId,
      altText,
    })),
  });
}

export type RubricDescriptor = Readonly<{
  id: string;
  level: string;
  description: string;
}>;
export type RubricCriterion = Readonly<{
  id: string;
  skill: SpeakingWritingSkill;
  label: string;
  weightBasisPoints: number;
  minScore: number;
  maxScore: number;
  descriptors: readonly RubricDescriptor[];
}>;
export type AdvisoryRubric = Readonly<{
  id: string;
  version: string;
  skill: SpeakingWritingSkill;
  criteria: readonly RubricCriterion[];
  advisoryOnly: true;
}>;
export type LearnerAdvisoryRubric = Readonly<{
  id: string;
  version: string;
  skill: SpeakingWritingSkill;
  criteria: readonly Readonly<{
    id: string;
    label: string;
    descriptors: readonly RubricDescriptor[];
  }>[];
}>;
export function createAdvisoryRubric(
  input: Omit<AdvisoryRubric, 'advisoryOnly'>,
): AdvisoryRubric {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !token(input.id) ||
    !token(input.version) ||
    !has(TOEIC_SPEAKING_WRITING_SKILLS, input.skill) ||
    !Array.isArray(input.criteria) ||
    input.criteria.length === 0 ||
    input.criteria.length > 12
  )
    fail('INVALID_METADATA');
  const criteria = input.criteria as readonly unknown[];
  const validCriteria = criteria.every((candidate) => {
    if (!isRecord(candidate)) return false;
    if (
      !token(candidate.id) ||
      candidate.skill !== input.skill ||
      !text(candidate.label, 200) ||
      typeof candidate.weightBasisPoints !== 'number' ||
      !Number.isInteger(candidate.weightBasisPoints) ||
      candidate.weightBasisPoints < 1 ||
      candidate.weightBasisPoints > 10000 ||
      typeof candidate.minScore !== 'number' ||
      !Number.isInteger(candidate.minScore) ||
      typeof candidate.maxScore !== 'number' ||
      !Number.isInteger(candidate.maxScore) ||
      candidate.minScore < 0 ||
      candidate.maxScore <= candidate.minScore ||
      candidate.maxScore > 100 ||
      !Array.isArray(candidate.descriptors) ||
      candidate.descriptors.length === 0 ||
      candidate.descriptors.length > 10
    )
      return false;
    return candidate.descriptors.every(
      (descriptor) =>
        isRecord(descriptor) &&
        token(descriptor.id) &&
        text(descriptor.level, 50) &&
        text(descriptor.description, 1000),
    );
  });
  if (!validCriteria) fail('INVALID_METADATA');
  const typedCriteria = criteria as readonly RubricCriterion[];
  if (
    new Set(typedCriteria.map((criterion) => criterion.id)).size !==
      typedCriteria.length ||
    typedCriteria.reduce(
      (sum, criterion) => sum + criterion.weightBasisPoints,
      0,
    ) !== 10000 ||
    typedCriteria.some(
      (criterion) =>
        new Set(criterion.descriptors.map((descriptor) => descriptor.id))
          .size !== criterion.descriptors.length,
    )
  )
    fail('INVALID_METADATA');
  return cloneFreeze({
    ...input,
    id: input.id.trim(),
    version: input.version.trim(),
    advisoryOnly: true,
  });
}

export function advisoryRubricProjection(
  rubric: AdvisoryRubric,
): LearnerAdvisoryRubric {
  if (!rubric || rubric.advisoryOnly !== true) fail('INVALID_METADATA');
  return cloneFreeze({
    id: rubric.id,
    version: rubric.version,
    skill: rubric.skill,
    criteria: rubric.criteria.map(({ id, label, descriptors }) => ({
      id,
      label,
      descriptors,
    })),
  });
}

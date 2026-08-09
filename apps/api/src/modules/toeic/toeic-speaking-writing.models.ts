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

const has = (values: readonly string[], value: unknown): value is string =>
  typeof value === 'string' && values.includes(value);
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
    !input.media?.some((m) => m.kind === 'IMAGE')
  )
    fail('INVALID_METADATA');
  if (
    !input.id ||
    !input.version ||
    input.instruction.length < 1 ||
    input.instruction.length > 2000 ||
    input.prompt.length < 1 ||
    input.prompt.length > 5000 ||
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
    input.media?.some(
      (m) =>
        !['IMAGE', 'AUDIO'].includes(m.kind) ||
        !m.assetId ||
        m.assetId.length > 200 ||
        (m.altText !== undefined && m.altText.length > 500),
    )
  )
    fail('INVALID_METADATA');
  if (
    (input.skill === 'SPEAKING' && input.durationSeconds === undefined) ||
    (input.skill === 'WRITING' && input.maxWords === undefined)
  )
    fail('INVALID_METADATA');
  return cloneFreeze({
    ...input,
    media: input.media ? [...input.media] : undefined,
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
export function createAdvisoryRubric(
  input: Omit<AdvisoryRubric, 'advisoryOnly'>,
): AdvisoryRubric {
  if (
    !input.id ||
    !input.version ||
    !has(TOEIC_SPEAKING_WRITING_SKILLS, input.skill) ||
    !input.criteria.length ||
    input.criteria.some(
      (c) =>
        !c.id ||
        c.skill !== input.skill ||
        !c.label ||
        !Number.isInteger(c.weightBasisPoints) ||
        c.weightBasisPoints <= 0 ||
        c.minScore < 0 ||
        c.maxScore <= c.minScore ||
        !c.descriptors.length ||
        c.descriptors.some(
          (d) =>
            !d.id || !d.level || !d.description || d.description.length > 1000,
        ),
    ) ||
    new Set(input.criteria.map((c) => c.id)).size !== input.criteria.length ||
    input.criteria.reduce((sum, c) => sum + c.weightBasisPoints, 0) !== 10000 ||
    input.criteria.some(
      (c) =>
        new Set(c.descriptors.map((d) => d.id)).size !== c.descriptors.length,
    )
  )
    fail('INVALID_METADATA');
  return cloneFreeze({ ...input, advisoryOnly: true });
}

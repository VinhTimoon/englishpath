import type { GovernedContentVersion } from '../content-governance';

export const VOCABULARY_LEVELS = [
  'daily-basic',
  'common-communication',
  'toeic-core',
  'workplace-english',
  'advanced-toeic',
  'academic-professional',
] as const;

export type VocabularyLevel = (typeof VOCABULARY_LEVELS)[number];
export type VocabularyNodeKind = 'domain' | 'topic' | 'subtopic';

export type VocabularyTaxonomyNode = Readonly<{
  id: string;
  parentId?: string;
  kind: VocabularyNodeKind;
  label: string;
  order: number;
  vocabularyCount: number;
  levels: readonly VocabularyLevel[];
  tracks: readonly string[];
  skills: readonly string[];
  toeicParts: readonly number[];
  governance: GovernedContentVersion;
}>;

export type VocabularySnapshot = Readonly<{
  nodes: readonly VocabularyTaxonomyNode[];
}>;

export type VocabularyFilter = Readonly<{
  level?: VocabularyLevel;
  track?: string;
  skill?: string;
  toeicPart?: number;
}>;

export type TopicSummary = Readonly<{
  id: string;
  domainId: string;
  label: string;
  order: number;
  vocabularyCount: number;
  levels: readonly VocabularyLevel[];
  tracks: readonly string[];
  skills: readonly string[];
  toeicParts: readonly number[];
}>;

export type MindmapNode = Readonly<{
  id: string;
  kind: VocabularyNodeKind;
  label: string;
  vocabularyCount: number;
  levels: readonly VocabularyLevel[];
  tracks: readonly string[];
  skills: readonly string[];
  toeicParts: readonly number[];
  children: readonly MindmapNode[];
}>;

export interface VocabularyRepository {
  loadSnapshot(): Promise<VocabularySnapshot>;
}

export type PublishedVocabularyItem = Readonly<{
  id: string;
  taxonomyNodeId: string;
  word: string;
  meaning: string;
  example: string | null;
  pronunciation: string | null;
}>;

export interface VocabularyItemRepository {
  listPublished(
    input: Readonly<{
      taxonomyNodeId: string;
      now: Date;
      skip: number;
      take: number;
    }>,
  ): Promise<readonly PublishedVocabularyItem[]>;
  countPublished(
    input: Readonly<{
      taxonomyNodeId: string;
      now: Date;
    }>,
  ): Promise<number>;
}

export const VOCABULARY_REPOSITORY = Symbol('VOCABULARY_REPOSITORY');
export const VOCABULARY_ITEM_REPOSITORY = Symbol('VOCABULARY_ITEM_REPOSITORY');

export function deepFreezeVocabulary<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeVocabulary(child);
  }
  return Object.freeze(value);
}

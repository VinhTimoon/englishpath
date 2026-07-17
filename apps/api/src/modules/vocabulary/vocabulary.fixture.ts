import {
  authorizeHumanContentAction,
  createGovernedContentVersion,
  publishContentVersion,
  reviewContentVersion,
} from '../content-governance';
import {
  deepFreezeVocabulary,
  type VocabularySnapshot,
  type VocabularyTaxonomyNode,
} from './vocabulary.models';

const reviewer = { authorizeHumanAction: () => 'fixture-reviewer' };

function publishedGovernance(id: string) {
  const draft = createGovernedContentVersion({
    contentId: `taxonomy:${id}`,
    versionId: `taxonomy:${id}:v1`,
    createdByActorId: 'fixture-author',
    provenance: 'human_authored',
    usageScope: 'learning',
    accessTier: 'public',
    taxonomy: {
      level: 'shared',
      topic: id,
      collocations: [],
      relatedSkills: ['reading'],
      tracks: ['english-foundation'],
      toeicParts: [],
    },
    source: {
      sourceId: `v2-taxonomy:${id}`,
      checksum: `fixture-sha256:${id}`,
      sourceVersion: 'v2',
    },
    rights: {
      owner: 'EnglishPath',
      licenseStatus: 'approved',
      allowedUsageScopes: ['learning'],
      allowedAccessTiers: ['public'],
    },
  });
  const reviewed = reviewContentVersion(
    draft,
    {
      reviewerId: 'fixture-reviewer',
      decision: 'approved',
      reviewedAt: '2026-07-17T00:00:00.000Z',
      contentId: draft.contentId,
      versionId: draft.versionId,
      checksum: draft.source.checksum,
      sourceVersion: draft.source.sourceVersion,
    },
    authorizeHumanContentAction(reviewer, 'review'),
  );
  return publishContentVersion(reviewed, {
    authorization: authorizeHumanContentAction(reviewer, 'publish'),
  });
}

function node(
  input: Omit<VocabularyTaxonomyNode, 'governance'>,
): VocabularyTaxonomyNode {
  return deepFreezeVocabulary({
    ...input,
    governance: publishedGovernance(input.id),
  });
}

export const VOCABULARY_FIXTURE: VocabularySnapshot = deepFreezeVocabulary({
  nodes: [
    node({
      id: 'workplace',
      kind: 'domain',
      label: 'Workplace',
      order: 1,
      vocabularyCount: 120,
      levels: ['workplace-english', 'toeic-core', 'advanced-toeic'],
      tracks: ['workplace-english', 'toeic-listening-reading'],
      skills: ['reading', 'listening', 'speaking', 'writing'],
      toeicParts: [2, 3, 4, 5, 6, 7],
    }),
    node({
      id: 'workplace-meetings',
      parentId: 'workplace',
      kind: 'topic',
      label: 'Meetings',
      order: 1,
      vocabularyCount: 64,
      levels: ['workplace-english', 'toeic-core'],
      tracks: ['workplace-english', 'toeic-listening-reading'],
      skills: ['listening', 'speaking'],
      toeicParts: [2, 3, 4],
    }),
    node({
      id: 'workplace-meetings-scheduling',
      parentId: 'workplace-meetings',
      kind: 'subtopic',
      label: 'Scheduling',
      order: 1,
      vocabularyCount: 24,
      levels: ['workplace-english', 'toeic-core'],
      tracks: ['workplace-english', 'toeic-listening-reading'],
      skills: ['listening', 'speaking'],
      toeicParts: [2, 3],
    }),
    node({
      id: 'daily-life',
      kind: 'domain',
      label: 'Daily Life',
      order: 2,
      vocabularyCount: 180,
      levels: ['daily-basic', 'common-communication'],
      tracks: ['english-foundation', 'daily-communication'],
      skills: ['reading', 'listening', 'speaking'],
      toeicParts: [],
    }),
    node({
      id: 'daily-life-travel',
      parentId: 'daily-life',
      kind: 'topic',
      label: 'Travel',
      order: 1,
      vocabularyCount: 72,
      levels: ['daily-basic', 'common-communication'],
      tracks: ['english-foundation', 'daily-communication'],
      skills: ['listening', 'speaking'],
      toeicParts: [],
    }),
    node({
      id: 'professional',
      kind: 'domain',
      label: 'Professional',
      order: 3,
      vocabularyCount: 80,
      levels: ['academic-professional'],
      tracks: ['four-skills-english'],
      skills: ['reading', 'writing'],
      toeicParts: [],
    }),
    node({
      id: 'professional-technology',
      parentId: 'professional',
      kind: 'topic',
      label: 'Technology',
      order: 1,
      vocabularyCount: 36,
      levels: ['academic-professional'],
      tracks: ['four-skills-english'],
      skills: ['reading', 'writing'],
      toeicParts: [],
    }),
  ],
});

import { Inject, Injectable } from '@nestjs/common';
import { isPublicLearningContentVersion } from '../content-governance';
import { VOCABULARY_ERROR_CODES, VocabularyError } from './vocabulary.error';
import {
  deepFreezeVocabulary,
  VOCABULARY_REPOSITORY,
  VOCABULARY_LEVELS,
  type MindmapNode,
  type TopicSummary,
  type VocabularyFilter,
  type VocabularyRepository,
  type VocabularyTaxonomyNode,
} from './vocabulary.models';

type TopicQuery = VocabularyFilter & Readonly<{ page: number; size: number }>;
type MindmapQuery = VocabularyFilter &
  Readonly<{ rootId?: string; depth: number }>;

function compareNodes(
  left: VocabularyTaxonomyNode,
  right: VocabularyTaxonomyNode,
) {
  return left.order - right.order || left.id.localeCompare(right.id, 'en');
}

function validateSnapshot(
  snapshot: unknown,
): readonly VocabularyTaxonomyNode[] {
  if (!snapshot || typeof snapshot !== 'object' || !('nodes' in snapshot)) {
    throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
  }
  const { nodes } = snapshot as { nodes?: unknown };
  if (Object.prototype.toString.call(nodes) !== '[object Array]') {
    throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
  }
  return nodes as readonly VocabularyTaxonomyNode[];
}

function validateGraph(nodes: readonly VocabularyTaxonomyNode[]) {
  if (
    Object.prototype.toString.call(nodes) !== '[object Array]' ||
    nodes.length === 0
  ) {
    throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
  }
  const byId = new Map<string, VocabularyTaxonomyNode>();
  const identifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const hasUniqueValues = (values: readonly unknown[]) =>
    new Set(values).size === values.length;
  const hasValidTokens = (values: readonly unknown[], allowEmpty = false) =>
    (allowEmpty || values.length > 0) &&
    hasUniqueValues(values) &&
    values.every(
      (value) =>
        typeof value === 'string' &&
        value.length <= 64 &&
        identifierPattern.test(value),
    );
  for (const node of nodes) {
    if (
      !node ||
      typeof node.id !== 'string' ||
      !identifierPattern.test(node.id) ||
      (node.parentId !== undefined &&
        (typeof node.parentId !== 'string' ||
          !identifierPattern.test(node.parentId))) ||
      byId.has(node.id) ||
      !['domain', 'topic', 'subtopic'].includes(node.kind) ||
      typeof node.label !== 'string' ||
      !node.label.trim() ||
      node.label !== node.label.trim() ||
      node.label.length > 120 ||
      !Number.isInteger(node.order) ||
      node.order < 0 ||
      !Number.isInteger(node.vocabularyCount) ||
      node.vocabularyCount < 0 ||
      Object.prototype.toString.call(node.levels) !== '[object Array]' ||
      Object.prototype.toString.call(node.tracks) !== '[object Array]' ||
      Object.prototype.toString.call(node.skills) !== '[object Array]' ||
      Object.prototype.toString.call(node.toeicParts) !== '[object Array]' ||
      node.levels.length === 0 ||
      !hasUniqueValues(node.levels) ||
      node.levels.some((level) => !VOCABULARY_LEVELS.includes(level)) ||
      !hasValidTokens(node.tracks) ||
      !hasValidTokens(node.skills) ||
      !hasUniqueValues(node.toeicParts) ||
      node.toeicParts.some(
        (part) => !Number.isInteger(part) || part < 1 || part > 7,
      )
    ) {
      throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
    }
    byId.set(node.id, node);
  }

  for (const node of nodes) {
    if (node.kind === 'domain') {
      if (node.parentId !== undefined) {
        throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
      }
      continue;
    }
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const expectedParentKind = node.kind === 'topic' ? 'domain' : 'topic';
    if (!parent || parent.kind !== expectedParentKind) {
      throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
    }
  }

  for (const node of nodes) {
    const visited = new Set<string>();
    let current: VocabularyTaxonomyNode | undefined = node;
    let depth = 0;
    while (current) {
      if (visited.has(current.id) || depth > 2) {
        throw new VocabularyError(VOCABULARY_ERROR_CODES.INVALID_GRAPH);
      }
      visited.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
      depth += 1;
    }
  }
  return byId;
}

function matches(node: VocabularyTaxonomyNode, filter: VocabularyFilter) {
  const includes = (values: readonly string[], value?: string) =>
    !value || values.some((item) => item.toLowerCase() === value.toLowerCase());
  return (
    (!filter.level || node.levels.includes(filter.level)) &&
    includes(node.tracks, filter.track) &&
    includes(node.skills, filter.skill) &&
    (!filter.toeicPart || node.toeicParts.includes(filter.toeicPart))
  );
}

function publicNodes(
  nodes: readonly VocabularyTaxonomyNode[],
  byId: ReadonlyMap<string, VocabularyTaxonomyNode>,
) {
  const eligible = new Set(
    nodes
      .filter((node) => isPublicLearningContentVersion(node.governance))
      .map((node) => node.id),
  );
  return nodes.filter((node) => {
    let current: VocabularyTaxonomyNode | undefined = node;
    while (current) {
      if (!eligible.has(current.id)) return false;
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return true;
  });
}

function projectTopic(node: VocabularyTaxonomyNode): TopicSummary {
  return deepFreezeVocabulary({
    id: node.id,
    domainId: node.parentId!,
    label: node.label,
    order: node.order,
    vocabularyCount: node.vocabularyCount,
    levels: [...node.levels],
    tracks: [...node.tracks],
    skills: [...node.skills],
    toeicParts: [...node.toeicParts],
  });
}

@Injectable()
export class VocabularyService {
  constructor(
    @Inject(VOCABULARY_REPOSITORY)
    private readonly repository: VocabularyRepository,
  ) {}

  async listTopics(query: TopicQuery) {
    const snapshot = await this.repository.loadSnapshot();
    const nodes = validateSnapshot(snapshot);
    const byId = validateGraph(nodes);
    const topics = publicNodes(nodes, byId)
      .filter((node) => node.kind === 'topic' && matches(node, query))
      .sort(compareNodes)
      .map(projectTopic);
    const start = (query.page - 1) * query.size;
    return deepFreezeVocabulary({
      data: topics.slice(start, start + query.size),
      page: {
        number: query.page,
        size: query.size,
        totalItems: topics.length,
        totalPages: Math.ceil(topics.length / query.size),
      },
    });
  }

  async getMindmap(query: MindmapQuery) {
    const snapshot = await this.repository.loadSnapshot();
    const graph = validateSnapshot(snapshot);
    const allById = validateGraph(graph);
    const nodes = publicNodes(graph, allById);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    if (query.rootId && !byId.has(query.rootId)) {
      throw new VocabularyError(VOCABULARY_ERROR_CODES.ROOT_NOT_FOUND);
    }

    const hasFilter = Boolean(
      query.level || query.track || query.skill || query.toeicPart,
    );
    const retained = new Set<string>();
    for (const node of nodes) {
      if (!hasFilter || matches(node, query)) {
        let current: VocabularyTaxonomyNode | undefined = node;
        while (current) {
          retained.add(current.id);
          current = current.parentId ? byId.get(current.parentId) : undefined;
        }
      }
    }

    const children = new Map<string | undefined, VocabularyTaxonomyNode[]>();
    for (const node of nodes.filter((candidate) =>
      retained.has(candidate.id),
    )) {
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node);
      children.set(node.parentId, siblings);
    }
    for (const siblings of children.values()) siblings.sort(compareNodes);

    const build = (
      node: VocabularyTaxonomyNode,
      remaining: number,
    ): MindmapNode =>
      deepFreezeVocabulary({
        id: node.id,
        kind: node.kind,
        label: node.label,
        vocabularyCount: node.vocabularyCount,
        levels: [...node.levels],
        tracks: [...node.tracks],
        skills: [...node.skills],
        toeicParts: [...node.toeicParts],
        children:
          remaining > 1
            ? (children.get(node.id) ?? []).map((child) =>
                build(child, remaining - 1),
              )
            : [],
      });

    const roots = query.rootId
      ? [byId.get(query.rootId)!]
      : (children.get(undefined) ?? []);
    return deepFreezeVocabulary({
      data: {
        roots: roots
          .filter((node) => retained.has(node.id))
          .map((node) => build(node, query.depth)),
      },
    });
  }
}

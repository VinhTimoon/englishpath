import { VOCABULARY_FIXTURE } from './vocabulary.fixture';
import { VOCABULARY_ERROR_CODES, VocabularyError } from './vocabulary.error';
import type {
  TopicSummary,
  VocabularyRepository,
  VocabularySnapshot,
  VocabularyTaxonomyNode,
} from './vocabulary.models';
import { VOCABULARY_LEVELS } from './vocabulary.models';
import { VocabularyService } from './vocabulary.service';

function repository(snapshot: VocabularySnapshot): VocabularyRepository & {
  loadSnapshot: jest.Mock;
} {
  return { loadSnapshot: jest.fn().mockResolvedValue(snapshot) };
}

describe('VocabularyService', () => {
  it('rejects an empty graph', async () => {
    const service = new VocabularyService(repository({ nodes: [] }));
    await expect(
      service.listTopics({ page: 1, size: 20 }),
    ).rejects.toMatchObject({
      code: VOCABULARY_ERROR_CODES.INVALID_GRAPH,
    });
  });

  it('filters and paginates deterministic public topic projections', async () => {
    const port = repository(VOCABULARY_FIXTURE);
    const service = new VocabularyService(port);

    const result = await service.listTopics({
      page: 1,
      size: 1,
      level: 'toeic-core',
      toeicPart: 3,
    });

    expect(result.data.map(({ id }) => id)).toEqual(['workplace-meetings']);
    expect(result.page).toEqual({
      number: 1,
      size: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(port.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(result)).toBe(true);
    expect(() =>
      (result.data as unknown as TopicSummary[]).push(result.data[0]),
    ).toThrow();
    expect(JSON.stringify(result)).not.toMatch(
      /checksum|reviewer|licenseStatus|sourceId/i,
    );
  });

  it('builds a bounded filtered mindmap while retaining ancestors', async () => {
    const port = repository(VOCABULARY_FIXTURE);
    const service = new VocabularyService(port);

    const result = await service.getMindmap({
      depth: 3,
      skill: 'speaking',
      rootId: 'workplace',
    });

    expect(result.data.roots).toHaveLength(1);
    expect(result.data.roots[0].children[0].id).toBe('workplace-meetings');
    expect(result.data.roots[0].children[0].children[0].id).toBe(
      'workplace-meetings-scheduling',
    );
    expect(port.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(result.data.roots[0].children)).toBe(true);
  });

  it.each(VOCABULARY_LEVELS)(
    'accepts the v2 %s level filter',
    async (level) => {
      const service = new VocabularyService(repository(VOCABULARY_FIXTURE));
      const result = await service.listTopics({ page: 1, size: 20, level });
      expect(Array.isArray(result.data)).toBe(true);
    },
  );

  it('returns an empty page beyond the final page with stable totals', async () => {
    const service = new VocabularyService(repository(VOCABULARY_FIXTURE));
    const result = await service.listTopics({ page: 99, size: 2 });
    expect(result.data).toEqual([]);
    expect(result.page).toMatchObject({
      number: 99,
      size: 2,
      totalItems: 3,
      totalPages: 2,
    });
  });

  it('fails closed for missing roots', async () => {
    const service = new VocabularyService(repository(VOCABULARY_FIXTURE));
    await expect(
      service.getMindmap({ depth: 2, rootId: 'missing-root' }),
    ).rejects.toMatchObject({
      code: VOCABULARY_ERROR_CODES.ROOT_NOT_FOUND,
    });
  });

  it.each([
    (nodes: readonly VocabularyTaxonomyNode[]) => [...nodes, nodes[0]],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      ...nodes,
      { ...nodes[1], id: 'orphan', parentId: 'missing' },
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) =>
      nodes.map((node) => {
        if (node.id === 'workplace-meetings') {
          return { ...node, parentId: 'workplace-meetings-scheduling' };
        }
        if (node.id === 'workplace-meetings-scheduling') {
          return { ...node, parentId: 'workplace-meetings' };
        }
        return node;
      }),
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      ...nodes,
      {
        ...nodes[2],
        id: 'over-depth-node',
        parentId: 'workplace-meetings-scheduling',
      },
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], label: '  ' },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], levels: ['not-a-level'] as never },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], tracks: ['bad track'] },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], skills: ['reading', 'reading'] },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], toeicParts: [0, 8] },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], parentId: '' },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      { ...nodes[0], parentId: 0 as never },
      ...nodes.slice(1),
    ],
    (nodes: readonly VocabularyTaxonomyNode[]) => [
      ...nodes,
      {
        ...nodes[0],
        id: 'bad-root',
        parentId: 'workplace',
        kind: 'domain' as const,
      },
    ],
  ])(
    'rejects malformed graphs before returning partial data',
    async (mutate) => {
      const service = new VocabularyService(
        repository({ nodes: mutate(VOCABULARY_FIXTURE.nodes) }),
      );
      await expect(
        service.listTopics({ page: 1, size: 20 }),
      ).rejects.toBeInstanceOf(VocabularyError);
    },
  );

  it('excludes forged or unpublished governance records', async () => {
    const forged: VocabularyTaxonomyNode = {
      ...VOCABULARY_FIXTURE.nodes[1],
      id: 'forged-topic',
      governance: {
        ...VOCABULARY_FIXTURE.nodes[1].governance,
        publishStatus: 'draft',
      },
    };
    const service = new VocabularyService(
      repository({ nodes: [...VOCABULARY_FIXTURE.nodes, forged] }),
    );

    const result = await service.listTopics({ page: 1, size: 20 });
    expect(result.data.map(({ id }) => id)).not.toContain('forged-topic');
  });
});

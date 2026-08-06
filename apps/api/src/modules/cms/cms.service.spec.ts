jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { createApplicationPrincipal } from '../access';
import { AccessError } from '../access';
import { ContentGovernanceError } from '../content-governance';
import { CmsService } from './cms.service';
import { CreateContentVersionDto } from './dto/cms.dto';

const taxonomy = {
  id: 'workplace',
  parentId: null,
  level: 'B1',
  topic: 'Workplace English',
  subtopic: 'Meetings',
  collocations: ['take notes'],
  relatedSkills: ['Listening'],
  tracks: ['workplace'],
  toeicParts: [2, 3],
};

const externalIdentity = {
  provider: 'SUPABASE',
  subject: 'subject-1',
  issuer: 'issuer',
  audience: 'audience',
};

function principal(userId: string, roles: string[]) {
  return createApplicationPrincipal({
    applicationUserId: userId,
    externalIdentity,
    roles,
    ownerships: [],
    entitlements: [],
  });
}

function input(overrides: Partial<CreateContentVersionDto> = {}) {
  return {
    contentId: 'content-1',
    versionId: 'version-1',
    clientRequestId: 'request-1',
    contentType: 'lesson',
    title: 'Meeting vocabulary',
    body: 'A short governed lesson.',
    provenance: 'imported',
    usageScope: 'learning',
    accessTier: 'authenticated',
    taxonomyNodeId: 'workplace',
    sourceId: 'drive-file-1',
    sourceUrl: 'https://private.example/source',
    checksum: 'sha256:version1',
    sourceVersion: 'drive-v1',
    rightsOwner: 'Private Rights Owner',
    licenseStatus: 'approved',
    allowedUsageScopes: ['learning'],
    allowedAccessTiers: ['authenticated'],
    validUntil: '2027-01-01T00:00:00.000Z',
    ...overrides,
  } as CreateContentVersionDto;
}

describe('CmsService', () => {
  it('creates a draft, replays the idempotency key, and redacts private source fields', async () => {
    let row: Record<string, unknown> | undefined;
    const repository = {
      findTaxonomy: jest.fn().mockResolvedValue(taxonomy),
      findVersionByRequest: jest.fn().mockImplementation(() => row),
      createVersion: jest
        .fn()
        .mockImplementation((data: Record<string, unknown>) => {
          row = {
            ...data,
            previousVersionId: null,
            sourceUrl: 'https://private.example/source',
            validUntil: new Date('2027-01-01T00:00:00.000Z'),
            reviewStatus: 'draft',
            publishStatus: 'draft',
            reviewDecision: null,
            reviewerId: null,
            reviewedAt: null,
            reviewContentId: null,
            reviewVersionId: null,
            reviewChecksum: null,
            reviewSourceVersion: null,
            publishedAt: null,
          };
          return row;
        }),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new CmsService(repository as never, audit as never);

    const created = await service.createVersion(
      principal('importer-1', ['CONTENT_EDITOR']),
      input(),
      'cms-test-001',
    );
    expect(created.idempotencyStatus).toBe('created');
    expect(created.data).not.toHaveProperty('source.sourceUrl');
    expect(JSON.stringify(created.data)).not.toContain('Private Rights Owner');

    const replayed = await service.createVersion(
      principal('importer-1', ['CONTENT_EDITOR']),
      input(),
      'cms-test-002',
    );
    expect(replayed.idempotencyStatus).toBe('replayed');
    expect(repository.createVersion).toHaveBeenCalledTimes(1);
  });

  it('requires separate human review and publish authority', async () => {
    let row: Record<string, unknown> = {
      contentId: 'content-1',
      id: 'version-1',
      previousVersionId: null,
      clientRequestId: 'request-1',
      contentType: 'lesson',
      title: 'Meeting vocabulary',
      body: 'A short governed lesson.',
      createdByActorId: 'importer-1',
      provenance: 'imported',
      usageScope: 'learning',
      accessTier: 'authenticated',
      taxonomyNodeId: 'workplace',
      sourceId: 'drive-file-1',
      sourceUrl: 'https://private.example/source',
      checksum: 'sha256:version1',
      sourceVersion: 'drive-v1',
      rightsOwner: 'Private Rights Owner',
      licenseStatus: 'approved',
      allowedUsageScopes: ['learning'],
      allowedAccessTiers: ['authenticated'],
      validUntil: new Date('2027-01-01T00:00:00.000Z'),
      reviewStatus: 'draft',
      publishStatus: 'draft',
      reviewDecision: null,
      reviewerId: null,
      reviewedAt: null,
      reviewContentId: null,
      reviewVersionId: null,
      reviewChecksum: null,
      reviewSourceVersion: null,
      publishedAt: null,
    };
    const repository = {
      findVersion: jest.fn().mockImplementation(() => row),
      findTaxonomy: jest.fn().mockResolvedValue(taxonomy),
      saveReview: jest
        .fn()
        .mockImplementation((_id: string, data: Record<string, unknown>) => {
          row = { ...row, ...data };
          return row;
        }),
      savePublish: jest.fn().mockImplementation(() => {
        row = { ...row, publishStatus: 'published', publishedAt: new Date() };
        return row;
      }),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new CmsService(repository as never, audit as never);

    await expect(
      service.reviewVersion(
        principal('importer-1', ['CONTENT_EDITOR']),
        'version-1',
        {
          decision: 'approved',
          reviewedAt: '2026-08-06T09:00:00.000Z',
          contentId: 'content-1',
          versionId: 'version-1',
          checksum: 'sha256:version1',
          sourceVersion: 'drive-v1',
        },
        'cms-review-001',
      ),
    ).rejects.toBeInstanceOf(ContentGovernanceError);

    await service.reviewVersion(
      principal('reviewer-1', ['CONTENT_EDITOR']),
      'version-1',
      {
        decision: 'approved',
        reviewedAt: '2026-08-06T09:00:00.000Z',
        contentId: 'content-1',
        versionId: 'version-1',
        checksum: 'sha256:version1',
        sourceVersion: 'drive-v1',
      },
      'cms-review-002',
    );
    await expect(
      service.reviewVersion(
        principal('reviewer-1', ['CONTENT_EDITOR']),
        'version-1',
        {
          decision: 'approved',
          reviewedAt: '2026-08-06T09:00:00.000Z',
          contentId: 'content-1',
          versionId: 'version-1',
          checksum: 'sha256:version1',
          sourceVersion: 'drive-v1',
        },
        'cms-review-003',
      ),
    ).rejects.toBeInstanceOf(ContentGovernanceError);
    const published = await service.publishVersion(
      principal('publisher-1', ['ADMIN']),
      'version-1',
      { clientRequestId: 'publish-1' },
      'cms-publish-001',
    );
    expect(published.governance.publishStatus).toBe('published');
    expect(repository.savePublish).toHaveBeenCalledTimes(1);
  });

  it('audits and rejects a learner role before mutation', async () => {
    const repository = {
      findTaxonomy: jest.fn(),
      createTaxonomy: jest.fn(),
    };
    const audit = { append: jest.fn().mockResolvedValue(undefined) };
    const service = new CmsService(repository as never, audit as never);

    await expect(
      service.createTaxonomy(
        principal('learner-1', ['FREE_USER']),
        {
          id: 'workplace',
          level: 'B1',
          topic: 'Workplace',
          collocations: [],
          relatedSkills: [],
          tracks: [],
          toeicParts: [],
        },
        'cms-denied-001',
      ),
    ).rejects.toBeInstanceOf(AccessError);
    expect(repository.createTaxonomy).not.toHaveBeenCalled();
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ policyResult: 'DENY' }),
    );
  });
});

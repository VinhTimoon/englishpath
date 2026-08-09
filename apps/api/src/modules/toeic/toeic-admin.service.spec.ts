jest.mock('../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

import { createHash } from 'node:crypto';
import {
  ToeicAccessTier,
  ToeicDifficulty,
  ToeicLicenseStatus,
  ToeicPart,
  ToeicPublicationState,
  ToeicQuestionType,
  ToeicReviewDecision,
  ToeicReviewStatus,
  ToeicUsageScope,
} from '../../generated/prisma/enums';
import { createApplicationPrincipal, createExternalIdentity } from '../access';
import type { AuditService } from '../audit/audit.service';
import type { ToeicImportDto } from './dto/toeic-admin.dto';
import type {
  ToeicAdminRecord,
  ToeicAdminRepository,
} from './toeic-admin.models';
import { TOEIC_ERROR_CODES } from './toeic-question.error';
import { ToeicAdminService } from './toeic-admin.service';

const identity = createExternalIdentity({
  provider: 'SUPABASE',
  subject: 'subject',
  issuer: 'issuer',
  audience: 'audience',
});

function principal(id: string, roles: string[]) {
  return createApplicationPrincipal({
    applicationUserId: id,
    externalIdentity: identity,
    roles,
    ownerships: [],
    entitlements: [],
  });
}

const importDto: ToeicImportDto = {
  questionId: 'question-1',
  version: 1,
  part: ToeicPart.PART_5,
  questionType: ToeicQuestionType.INCOMPLETE_SENTENCE,
  difficulty: ToeicDifficulty.INTERMEDIATE,
  topic: 'workplace',
  stimulusGroup: undefined,
  prompt: 'Choose the correct option.',
  options: [
    { id: 'A', text: 'Option A' },
    { id: 'B', text: 'Option B' },
  ],
  mediaReference: undefined,
  explanation: 'A learner-safe explanation.',
  correctAnswer: 'A',
  sourceIdentity: 'englishpath-original',
  sourceUrl: 'https://englishpath.example/content/toeic',
  checksum: '46937e92e5b63cd680ed2ff93e556347fffb4dbee5d1ea20fcb65d30c017aca8',
  sourceVersion: '2026-08',
  provenance: 'CC0-1.0',
  rightsOwner: 'EnglishPath',
  licenseStatus: ToeicLicenseStatus.APPROVED,
  allowedUsageScopes: [ToeicUsageScope.PRACTICE],
  accessTier: ToeicAccessTier.FREE,
  validUntil: '2030-01-01T00:00:00.000Z',
};

function withValidChecksum(
  overrides: Partial<ToeicImportDto> = {},
): ToeicImportDto {
  const dto = { ...importDto, ...overrides };
  const checksum = createHash('sha256')
    .update(
      JSON.stringify({
        questionId: dto.questionId,
        version: dto.version,
        previousVersionId: dto.previousVersionId ?? null,
        part: dto.part,
        questionType: dto.questionType,
        difficulty: dto.difficulty,
        topic: dto.topic ?? null,
        stimulusGroup: dto.stimulusGroup ?? null,
        prompt: dto.prompt,
        options: dto.options,
        mediaReference: dto.mediaReference ?? null,
        explanation: dto.explanation ?? null,
        correctAnswer: dto.correctAnswer,
        sourceIdentity: dto.sourceIdentity,
        sourceUrl: dto.sourceUrl,
        sourceVersion: dto.sourceVersion,
        provenance: dto.provenance,
        rightsOwner: dto.rightsOwner,
        licenseStatus: dto.licenseStatus,
        allowedUsageScopes: dto.allowedUsageScopes,
        accessTier: dto.accessTier,
        validUntil: dto.validUntil ?? null,
      }),
    )
    .digest('hex');
  return { ...dto, checksum };
}

function row(overrides: Partial<ToeicAdminRecord> = {}): ToeicAdminRecord {
  return {
    id: 'version-1',
    questionId: 'question-1',
    version: 1,
    previousVersionId: null,
    importIdentity: 'importer-1:idem-ep2-003',
    part: ToeicPart.PART_5,
    questionType: ToeicQuestionType.INCOMPLETE_SENTENCE,
    difficulty: ToeicDifficulty.INTERMEDIATE,
    topic: 'workplace',
    stimulusGroup: null,
    prompt: importDto.prompt,
    options: importDto.options,
    mediaReference: null,
    explanation: importDto.explanation ?? null,
    correctAnswer: importDto.correctAnswer,
    sourceIdentity: importDto.sourceIdentity,
    sourceUrl: importDto.sourceUrl ?? null,
    checksum: importDto.checksum,
    sourceVersion: importDto.sourceVersion,
    provenance: importDto.provenance,
    rightsOwner: importDto.rightsOwner,
    licenseStatus: ToeicLicenseStatus.APPROVED,
    allowedUsageScopes: [ToeicUsageScope.PRACTICE],
    accessTier: ToeicAccessTier.FREE,
    reviewStatus: ToeicReviewStatus.DRAFT,
    reviewDecision: null,
    reviewEvidence: null,
    reviewerIdentity: null,
    reviewedAt: null,
    publicationState: ToeicPublicationState.UNPUBLISHED,
    publishedAt: null,
    validUntil: new Date('2030-01-01T00:00:00.000Z'),
    ...overrides,
  } as ToeicAdminRecord;
}

function dependencies() {
  const repository: jest.Mocked<ToeicAdminRepository> = {
    findByImportIdentity: jest.fn(),
    findByVersionId: jest.fn(),
    findByQuestionVersion: jest.fn(),
    findBySourceVersion: jest.fn(),
    create: jest.fn(),
    review: jest.fn(),
    publish: jest.fn(),
  };
  const audit = {
    append: jest.fn().mockResolvedValue({}),
  } as unknown as AuditService;
  return {
    repository,
    audit,
    service: new ToeicAdminService(repository, audit),
  };
}

describe('ToeicAdminService', () => {
  it('creates an immutable draft with an actor-bound import identity and safe view', async () => {
    const { repository, service, audit } = dependencies();
    repository.findByImportIdentity.mockResolvedValue(null);
    repository.findByQuestionVersion.mockResolvedValue(null);
    repository.findBySourceVersion.mockResolvedValue(null);
    repository.create.mockResolvedValue(row());

    const result = await service.import(
      importDto,
      principal('importer-1', ['CONTENT_EDITOR']),
      'corr-ep2-003',
      'idem-ep2-003',
    );

    expect(result.idempotencyStatus).toBe('created');
    expect(result.data).not.toHaveProperty('correctAnswer');
    expect(result.data).not.toHaveProperty('rightsOwner');
    const createCall = repository.create.mock.calls[0]?.[0];
    expect(createCall).toBeDefined();
    if (!createCall) throw new Error('create was not called');
    expect(createCall.importIdentity).toBe(
      'importer-1:toeic.question-versions.import:idem-ep2-003',
    );
    expect(createCall.reviewStatus).toBe(ToeicReviewStatus.DRAFT);
    expect(createCall.publicationState).toBe(ToeicPublicationState.UNPUBLISHED);
    const auditCalls = (audit as unknown as { append: jest.Mock }).append.mock
      .calls;
    expect(auditCalls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            action: 'toeic.question.import',
            policyResult: 'ALLOW',
          }),
        ],
      ]),
    );
  });

  it('replays exact imports and rejects conflicting retries', async () => {
    const first = dependencies();
    first.repository.findByImportIdentity.mockResolvedValue(row());
    await expect(
      first.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-003',
      ),
    ).resolves.toMatchObject({ idempotencyStatus: 'replayed' });

    const conflict = dependencies();
    conflict.repository.findByImportIdentity.mockResolvedValue(
      row({ prompt: 'Changed prompt' }),
    );
    await expect(
      conflict.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    const sourceConflict = dependencies();
    sourceConflict.repository.findByImportIdentity.mockResolvedValue(null);
    sourceConflict.repository.findByQuestionVersion.mockResolvedValue(null);
    sourceConflict.repository.findBySourceVersion.mockResolvedValue(row());
    await expect(
      sourceConflict.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-004',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });
  });

  it('rejects duplicate question-version identity and broken lineage', async () => {
    const duplicate = dependencies();
    duplicate.repository.findByImportIdentity.mockResolvedValue(null);
    duplicate.repository.findByQuestionVersion.mockResolvedValue(row());
    duplicate.repository.findBySourceVersion.mockResolvedValue(null);
    await expect(
      duplicate.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-008',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.CONFLICT });

    const gap = dependencies();
    gap.repository.findByImportIdentity.mockResolvedValue(null);
    gap.repository.findByQuestionVersion.mockResolvedValue(null);
    gap.repository.findBySourceVersion.mockResolvedValue(null);
    await expect(
      gap.service.import(
        withValidChecksum({ version: 2, previousVersionId: undefined }),
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-009',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_LINEAGE });

    const fork = dependencies();
    fork.repository.findByImportIdentity.mockResolvedValue(null);
    fork.repository.findByQuestionVersion.mockResolvedValue(null);
    fork.repository.findBySourceVersion.mockResolvedValue(null);
    fork.repository.findByVersionId.mockResolvedValue(
      row({ questionId: 'other-question', version: 1 }),
    );
    await expect(
      fork.service.import(
        withValidChecksum({ version: 2, previousVersionId: 'version-1' }),
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-010',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_LINEAGE });
  });

  it('replays an identical import that loses a concurrent unique race', async () => {
    const { repository, service } = dependencies();
    repository.findByImportIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        row({ importIdentity: 'importer-1:idem-ep2-011' }),
      );
    repository.findByQuestionVersion.mockResolvedValue(null);
    repository.findBySourceVersion.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-011',
      ),
    ).resolves.toMatchObject({ idempotencyStatus: 'replayed' });
  });

  it('enforces role separation and self-review prevention', async () => {
    const { repository, service } = dependencies();
    repository.findByVersionId.mockResolvedValue(row());
    await expect(
      service.review(
        'version-1',
        {
          decision: ToeicReviewDecision.APPROVE,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.STALE_REVIEW });

    await expect(
      service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('editor-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.FORBIDDEN });
  });

  it('binds review evidence and publishes only free practice content', async () => {
    const reviewedAt = new Date('2026-08-06T12:00:00.000Z');
    const reviewRow = row({
      importIdentity: 'importer-1:idem-ep2-003',
      reviewStatus: ToeicReviewStatus.DRAFT,
    });
    const { repository, service, audit } = dependencies();
    repository.findByVersionId.mockResolvedValue(reviewRow);
    repository.review.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: JSON.stringify({
          questionId: 'question-1',
          versionId: 'version-1',
          version: 1,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
          reviewerId: 'reviewer-1',
          reviewedAt: reviewedAt.toISOString(),
        }),
        reviewerIdentity: 'reviewer-1',
        reviewedAt,
      }),
    );
    await expect(
      service.review(
        'version-1',
        {
          decision: ToeicReviewDecision.APPROVE,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('reviewer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).resolves.toMatchObject({
      data: { reviewStatus: ToeicReviewStatus.REVIEWED },
    });

    repository.findByVersionId.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: JSON.stringify({
          questionId: 'question-1',
          versionId: 'version-1',
          version: 1,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
          reviewerId: 'reviewer-1',
          reviewedAt: reviewedAt.toISOString(),
        }),
        reviewerIdentity: 'reviewer-1',
        reviewedAt,
      }),
    );
    repository.publish.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: 'valid',
        reviewerIdentity: 'reviewer-1',
        reviewedAt,
        publicationState: ToeicPublicationState.PUBLISHED,
        publishedAt: new Date('2026-08-06T12:01:00.000Z'),
      }),
    );
    await expect(
      service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('admin-1', ['ADMIN']),
        'corr-ep2-003',
      ),
    ).resolves.toMatchObject({
      data: { publicationState: ToeicPublicationState.PUBLISHED },
    });
    expect(repository.publish.mock.calls).toHaveLength(1);
    const publishCall = repository.publish.mock.calls[0];
    expect(publishCall?.[0]).toBe('version-1');
    expect(publishCall?.[1]).toEqual({
      checksum: importDto.checksum,
      sourceVersion: importDto.sourceVersion,
    });
    expect(publishCall?.[2].publicationState).toBe(
      ToeicPublicationState.PUBLISHED,
    );
    const auditCalls = (audit as unknown as { append: jest.Mock }).append.mock
      .calls;
    expect(auditCalls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            action: 'toeic.question.publish',
            policyResult: 'ALLOW',
          }),
        ],
      ]),
    );
  });

  it('resolves governance from the server-owned source policy', async () => {
    const { repository, service } = dependencies();
    repository.findByImportIdentity.mockResolvedValue(null);
    const spoofed = {
      ...importDto,
      sourceIdentity: 'untrusted-source',
      licenseStatus: ToeicLicenseStatus.APPROVED,
      allowedUsageScopes: [ToeicUsageScope.PRACTICE],
      accessTier: ToeicAccessTier.FREE,
    };

    await expect(
      service.import(
        spoofed,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-005',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('allows the approved source to opt a governed item into MOCK_TEST use', async () => {
    const { repository, service } = dependencies();
    repository.findByImportIdentity.mockResolvedValue(null);
    repository.findByQuestionVersion.mockResolvedValue(null);
    repository.findBySourceVersion.mockResolvedValue(null);
    repository.create.mockResolvedValue(
      row({ allowedUsageScopes: [ToeicUsageScope.MOCK_TEST] }),
    );

    const dto = withValidChecksum({
      allowedUsageScopes: [ToeicUsageScope.MOCK_TEST],
    });
    await expect(
      service.import(
        dto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-mock-test',
      ),
    ).resolves.toMatchObject({ idempotencyStatus: 'created' });
    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      sourceIdentity: 'englishpath-original',
      allowedUsageScopes: [ToeicUsageScope.MOCK_TEST],
    });
  });

  it('rejects malformed version IDs and incomplete approvals', async () => {
    const malformed = dependencies();
    await expect(
      malformed.service.review(
        '<invalid>',
        {
          decision: ToeicReviewDecision.APPROVE,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('reviewer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
    expect(malformed.repository.findByVersionId.mock.calls).toHaveLength(0);

    const incomplete = dependencies();
    incomplete.repository.findByVersionId.mockResolvedValue(
      row({ options: [], reviewStatus: ToeicReviewStatus.DRAFT }),
    );
    await expect(
      incomplete.service.review(
        'version-1',
        {
          decision: ToeicReviewDecision.APPROVE,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('reviewer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.INVALID_CONTENT });
    expect(incomplete.repository.review.mock.calls).toHaveLength(0);
  });

  it('fails closed when an import lookup or authorization audit fails', async () => {
    const lookupFailure = dependencies();
    lookupFailure.repository.findByImportIdentity.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(
      lookupFailure.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-006',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.REPOSITORY_FAILURE });
    expect(lookupFailure.repository.create.mock.calls).toHaveLength(0);

    const auditFailure = dependencies();
    auditFailure.audit.append = jest
      .fn()
      .mockRejectedValue(new Error('audit unavailable')) as never;
    await expect(
      auditFailure.service.import(
        importDto,
        principal('importer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
        'idem-ep2-007',
      ),
    ).rejects.toThrow('audit unavailable');
    expect(auditFailure.repository.create.mock.calls).toHaveLength(0);
  });

  it('does not publish an already published version', async () => {
    const { repository, service } = dependencies();
    repository.findByVersionId.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        publicationState: ToeicPublicationState.PUBLISHED,
      }),
    );
    await expect(
      service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('admin-1', ['ADMIN']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_PUBLISHABLE });
    expect(repository.publish.mock.calls).toHaveLength(0);
  });

  it('requires source URL evidence before publication', async () => {
    const { repository, service } = dependencies();
    repository.findByVersionId.mockResolvedValue(
      row({
        sourceUrl: null,
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: JSON.stringify({
          questionId: 'question-1',
          versionId: 'version-1',
          version: 1,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
          reviewerId: 'reviewer-1',
          reviewedAt: '2026-08-06T12:00:00.000Z',
        }),
        reviewerIdentity: 'reviewer-1',
        reviewedAt: new Date('2026-08-06T12:00:00.000Z'),
      }),
    );
    await expect(
      service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('admin-1', ['ADMIN']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_PUBLISHABLE });
    expect(repository.publish.mock.calls).toHaveLength(0);
  });

  it.each([
    ['expired validity', { validUntil: new Date('2020-01-01T00:00:00.000Z') }],
    [
      'unapproved license',
      { licenseStatus: ToeicLicenseStatus.PENDING_REVIEW },
    ],
    ['incompatible access', { accessTier: ToeicAccessTier.PREMIUM }],
    ['missing practice scope', { allowedUsageScopes: [] }],
  ])('rejects publication with %s governance', (_label, overrides) => {
    const { repository, service } = dependencies();
    repository.findByVersionId.mockResolvedValue(
      row({
        ...overrides,
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: JSON.stringify({
          questionId: 'question-1',
          versionId: 'version-1',
          version: 1,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
          reviewerId: 'reviewer-1',
          reviewedAt: '2026-08-06T12:00:00.000Z',
        }),
        reviewerIdentity: 'reviewer-1',
        reviewedAt: new Date('2026-08-06T12:00:00.000Z'),
      }),
    );
    return expect(
      service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('admin-1', ['ADMIN']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_PUBLISHABLE });
  });

  it('rejects stale review evidence and records successful decisions', async () => {
    const stale = dependencies();
    stale.repository.findByVersionId.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REVIEWED,
        reviewDecision: ToeicReviewDecision.APPROVE,
        reviewEvidence: 'not-json',
        reviewerIdentity: 'reviewer-1',
        reviewedAt: new Date('2026-08-06T12:00:00.000Z'),
      }),
    );
    await expect(
      stale.service.publish(
        'version-1',
        {
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('admin-1', ['ADMIN']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.NOT_PUBLISHABLE });

    const rejected = dependencies();
    const rejectedRow = row({
      reviewStatus: ToeicReviewStatus.DRAFT,
      reviewDecision: null,
    });
    rejected.repository.findByVersionId.mockResolvedValue(rejectedRow);
    rejected.repository.review.mockResolvedValue(
      row({
        ...rejectedRow,
        reviewStatus: ToeicReviewStatus.REJECTED,
        reviewDecision: ToeicReviewDecision.REJECT,
      }),
    );
    await expect(
      rejected.service.review(
        'version-1',
        {
          decision: ToeicReviewDecision.REJECT,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('reviewer-1', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).resolves.toMatchObject({
      data: { reviewStatus: ToeicReviewStatus.REJECTED },
    });
    const auditCalls = (rejected.audit as unknown as { append: jest.Mock })
      .append.mock.calls;
    expect(auditCalls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            action: 'toeic.question.review',
            policyResult: 'ALLOW',
          }),
        ],
      ]),
    );

    rejected.repository.findByVersionId.mockResolvedValue(
      row({
        reviewStatus: ToeicReviewStatus.REJECTED,
        reviewDecision: ToeicReviewDecision.REJECT,
      }),
    );
    await expect(
      rejected.service.review(
        'version-1',
        {
          decision: ToeicReviewDecision.APPROVE,
          checksum: importDto.checksum,
          sourceVersion: importDto.sourceVersion,
        },
        principal('reviewer-2', ['CONTENT_EDITOR']),
        'corr-ep2-003',
      ),
    ).rejects.toMatchObject({ code: TOEIC_ERROR_CODES.STALE_REVIEW });
  });
});

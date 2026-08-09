import { toeicEligibleWhere } from './toeic-eligibility.policy';

describe('TOEIC learner eligibility governance', () => {
  it('requires the approved source allowlist for every learner usage scope', () => {
    expect(
      toeicEligibleWhere(new Date('2026-08-07T00:00:00.000Z'), {
        usageScope: 'MOCK_TEST',
      }),
    ).toMatchObject({
      sourceIdentity: { in: ['englishpath-original'] },
      allowedUsageScopes: { has: 'MOCK_TEST' },
      accessTier: 'FREE',
      reviewStatus: 'REVIEWED',
      publicationState: 'PUBLISHED',
      licenseStatus: 'APPROVED',
    });
  });

  it('keeps practice and timed-test predicates on the same approved source boundary', () => {
    const now = new Date('2026-08-07T00:00:00.000Z');
    const practice = toeicEligibleWhere(now, { usageScope: 'PRACTICE' });
    const timed = toeicEligibleWhere(now, { usageScope: 'MOCK_TEST' });

    expect(practice.sourceIdentity).toEqual(timed.sourceIdentity);
    expect(practice.allowedUsageScopes).toEqual({ has: 'PRACTICE' });
    expect(timed.allowedUsageScopes).toEqual({ has: 'MOCK_TEST' });
  });
});

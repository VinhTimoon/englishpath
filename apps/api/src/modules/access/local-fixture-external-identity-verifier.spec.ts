import { AccessError, ACCESS_ERROR_CODES } from './access-error';
import { LocalFixtureExternalIdentityVerifier } from './local-fixture-external-identity-verifier';

describe('LocalFixtureExternalIdentityVerifier', () => {
  const expectedIssuer = 'https://project.supabase.co/auth/v1';
  const expectedAudience = 'authenticated';

  const verifier = new LocalFixtureExternalIdentityVerifier({
    expectedIssuer,
    expectedAudience,
    now: () => Date.parse('2026-07-17T00:00:00.000Z'),
    fixtures: [
      {
        token: 'valid.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: 'user-123',
          issuer: expectedIssuer,
          audience: expectedAudience,
          verifiedEmail: 'learner@example.com',
          role: 'admin',
          admin: true,
          ownership: { resourceType: 'profile', resourceId: 'profile-123' },
          entitlement: 'premium',
        },
      },
      {
        token: 'expired.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: 'user-456',
          issuer: expectedIssuer,
          audience: expectedAudience,
        },
        expiresAt: '2026-01-01T00:00:00.000Z',
      },
      {
        token: 'wrongissuer.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: 'user-789',
          issuer: 'https://other-issuer.example',
          audience: expectedAudience,
        },
      },
      {
        token: 'wrongaudience.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: 'user-999',
          issuer: expectedIssuer,
          audience: 'public',
        },
      },
      {
        token: 'fixturemalformed.payload.signature',
        status: 'malformed',
      },
      {
        token: 'invalidexpiry.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: 'user-invalid-expiry',
          issuer: expectedIssuer,
          audience: expectedAudience,
        },
        expiresAt: 'not-a-date',
      },
      {
        token: 'invalididentity.payload.signature',
        status: 'verified',
        identity: {
          provider: 'supabase',
          subject: '',
          issuer: expectedIssuer,
          audience: expectedAudience,
        },
      },
    ],
  });

  it('returns only external identity fields for a valid fixture', async () => {
    const identity = await verifier.verify('valid.payload.signature');

    expect(identity).toEqual({
      provider: 'supabase',
      subject: 'user-123',
      issuer: expectedIssuer,
      audience: expectedAudience,
      verifiedEmail: 'learner@example.com',
    });
    expect(Object.isFrozen(identity)).toBe(true);
    expect('role' in identity).toBe(false);
    expect('admin' in identity).toBe(false);
    expect('ownership' in identity).toBe(false);
    expect('entitlement' in identity).toBe(false);
  });

  it.each([
    'unknown.payload.signature',
    'fixturemalformed.payload.signature',
    'expired.payload.signature',
    'wrongissuer.payload.signature',
    'wrongaudience.payload.signature',
    'invalidexpiry.payload.signature',
    'invalididentity.payload.signature',
    'not-a-jwt',
  ])(
    'fails closed with invalid identity evidence for %s',
    async (tokenValue) => {
      await expect(verifier.verify(tokenValue)).rejects.toMatchObject({
        code: ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE,
        message: 'Identity evidence is invalid.',
      });
    },
  );

  it('does not echo raw token values in outward errors', async () => {
    const tokenValue = 'unknown.payload.signature';

    try {
      await verifier.verify(tokenValue);
      fail('Expected verifier to throw.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).message).not.toContain(tokenValue);
      expect(String(error)).not.toContain(tokenValue);
    }
  });

  it('rejects ambiguous duplicate fixture tokens without echoing the token', () => {
    const duplicateToken = 'duplicate.payload.signature';

    try {
      new LocalFixtureExternalIdentityVerifier({
        expectedIssuer,
        expectedAudience,
        fixtures: [
          { token: duplicateToken, status: 'malformed' },
          { token: duplicateToken, status: 'expired' },
        ],
      });
      fail('Expected duplicate fixture configuration to throw.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccessError);
      expect(error).toMatchObject({
        code: ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE,
        message: 'Identity evidence is invalid.',
      });
      expect(String(error)).not.toContain(duplicateToken);
    }
  });
});

import { ACCESS_ERROR_CODES, AccessError } from '../access';
import {
  ConfiguredSupabaseJwtVerifier,
  SupabaseJwtVerifier,
} from './supabase-jwt.verifier';

describe('SupabaseJwtVerifier', () => {
  const issuer = 'https://project.supabase.co/auth/v1';
  const audience = 'authenticated';

  async function fixture() {
    const { generateKeyPair, SignJWT } = await import('jose');
    const keys = await generateKeyPair('ES256');
    const other = await generateKeyPair('ES256');
    const verifier = new SupabaseJwtVerifier({
      issuer,
      audience,
      algorithms: ['ES256'],
      key: () => keys.publicKey,
    });
    const sign = (
      overrides: {
        issuer?: string;
        audience?: string;
        expires?: string | null;
        notBefore?: string;
        subject?: string | null;
        key?: CryptoKey;
      } = {},
    ) => {
      let builder = new SignJWT({
        email: 'learner@example.com',
        role: 'SUPER_ADMIN',
      })
        .setProtectedHeader({ alg: 'ES256' })
        .setIssuer(overrides.issuer ?? issuer)
        .setAudience(overrides.audience ?? audience)
        .setIssuedAt();
      if (overrides.expires !== null) {
        builder = builder.setExpirationTime(overrides.expires ?? '5m');
      }
      if (overrides.subject !== null) {
        builder = builder.setSubject(overrides.subject ?? 'supabase-user-001');
      }
      if (overrides.notBefore)
        builder = builder.setNotBefore(overrides.notBefore);
      return builder.sign(overrides.key ?? keys.privateKey);
    };
    return { verifier, sign, other };
  }

  it('returns only verified identity evidence and ignores authorization claims', async () => {
    const { verifier, sign } = await fixture();
    const identity = await verifier.verify(await sign());
    expect(identity).toEqual({
      provider: 'SUPABASE',
      subject: 'supabase-user-001',
      issuer,
      audience,
      verifiedEmail: 'learner@example.com',
    });
    expect(identity).not.toHaveProperty('role');
  });

  it.each([
    'issuer',
    'audience',
    'expired',
    'expiration',
    'not-before',
    'subject',
    'signature',
  ])('sanitizes invalid %s evidence', async (failure) => {
    const { verifier, sign, other } = await fixture();
    const token = await sign({
      ...(failure === 'issuer' ? { issuer: 'https://attacker.invalid' } : {}),
      ...(failure === 'audience' ? { audience: 'service_role' } : {}),
      ...(failure === 'expired' ? { expires: '-10m' } : {}),
      ...(failure === 'expiration' ? { expires: null } : {}),
      ...(failure === 'not-before' ? { notBefore: '10m' } : {}),
      ...(failure === 'subject' ? { subject: null } : {}),
      ...(failure === 'signature' ? { key: other.privateKey } : {}),
    });
    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE,
      message: 'Identity evidence is invalid.',
    } satisfies Partial<AccessError>);
  });

  it('rejects algorithms outside the configured allowlist', async () => {
    const { generateSecret, SignJWT } = await import('jose');
    const secret = await generateSecret('HS256');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('supabase-user-001')
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime('5m')
      .sign(secret);
    const { verifier } = await fixture();
    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE,
    });
  });

  it('fails closed without production JWKS configuration', async () => {
    const verifier = new ConfiguredSupabaseJwtVerifier({
      get: jest.fn().mockReturnValue(undefined),
    } as never);
    await expect(verifier.verify('secret-token-value')).rejects.toMatchObject({
      code: ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE,
    });
  });
});

import { AccessError, ACCESS_ERROR_CODES } from './access-error';
import { createExternalIdentity, type ExternalIdentity } from './access.models';
import type { ExternalIdentityVerifier } from './access.ports';

export type LocalFixtureExternalIdentity =
  | Readonly<{
      token: string;
      status: 'verified';
      identity: ExternalIdentity & Record<string, unknown>;
      expiresAt?: Date | string;
    }>
  | Readonly<{
      token: string;
      status: 'malformed' | 'expired' | 'wrong_issuer' | 'wrong_audience';
    }>;

export type LocalFixtureVerifierOptions = Readonly<{
  expectedIssuer: string;
  expectedAudience: string;
  fixtures: readonly LocalFixtureExternalIdentity[];
  now?: () => number;
}>;

function isJwtLikeToken(token: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

function isInvalidOrExpired(
  expiresAt: Date | string | undefined,
  now: () => number,
) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtValue =
    expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);

  return !Number.isFinite(expiresAtValue) || expiresAtValue <= now();
}

export class LocalFixtureExternalIdentityVerifier implements ExternalIdentityVerifier {
  private readonly expectedIssuer: string;

  private readonly expectedAudience: string;

  private readonly fixtures: ReadonlyMap<string, LocalFixtureExternalIdentity>;

  private readonly now: () => number;

  constructor(options: LocalFixtureVerifierOptions) {
    this.expectedIssuer = options.expectedIssuer.trim();
    this.expectedAudience = options.expectedAudience.trim();
    this.now = options.now ?? Date.now;
    const fixtures = new Map(
      options.fixtures.map((fixture) => [fixture.token, fixture]),
    );
    if (fixtures.size !== options.fixtures.length) {
      throw new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE);
    }
    this.fixtures = fixtures;
  }

  verify(token: string): Promise<ExternalIdentity> {
    if (!isJwtLikeToken(token)) {
      return Promise.reject(
        new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE),
      );
    }

    const fixture = this.fixtures.get(token);
    if (!fixture) {
      return Promise.reject(
        new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE),
      );
    }

    if (fixture.status !== 'verified') {
      return Promise.reject(
        new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE),
      );
    }

    let identity: ExternalIdentity;
    try {
      identity = createExternalIdentity(fixture.identity);
    } catch {
      return Promise.reject(
        new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE),
      );
    }

    if (
      isInvalidOrExpired(fixture.expiresAt, this.now) ||
      identity.issuer !== this.expectedIssuer ||
      identity.audience !== this.expectedAudience
    ) {
      return Promise.reject(
        new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE),
      );
    }

    return Promise.resolve(identity);
  }
}

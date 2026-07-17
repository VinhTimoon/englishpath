import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JWTVerifyGetKey } from 'jose';
import {
  ACCESS_ERROR_CODES,
  AccessError,
  createExternalIdentity,
  type ExternalIdentityVerifier,
} from '../access';

export type SupabaseJwtOptions = Readonly<{
  issuer: string;
  audience: string;
  algorithms: readonly string[];
  key: JWTVerifyGetKey;
}>;

export class SupabaseJwtVerifier implements ExternalIdentityVerifier {
  constructor(private readonly options: SupabaseJwtOptions) {}

  async verify(token: string) {
    try {
      const { jwtVerify } = await import('jose');
      const { payload } = await jwtVerify(token, this.options.key, {
        issuer: this.options.issuer,
        audience: this.options.audience,
        algorithms: [...this.options.algorithms],
        requiredClaims: ['exp', 'iat', 'sub'],
        clockTolerance: 5,
      });
      if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
        throw new Error('Missing subject');
      }
      return createExternalIdentity({
        provider: 'SUPABASE',
        subject: payload.sub,
        issuer: this.options.issuer,
        audience: this.options.audience,
        ...(typeof payload.email === 'string'
          ? { verifiedEmail: payload.email }
          : {}),
      });
    } catch {
      throw new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE);
    }
  }
}

@Injectable()
export class ConfiguredSupabaseJwtVerifier implements ExternalIdentityVerifier {
  private verifier?: Promise<SupabaseJwtVerifier>;

  constructor(private readonly config: ConfigService) {}

  async verify(token: string) {
    try {
      this.verifier ??= this.createVerifier();
      return (await this.verifier).verify(token);
    } catch (error: unknown) {
      if (error instanceof AccessError) throw error;
      throw new AccessError(ACCESS_ERROR_CODES.INVALID_IDENTITY_EVIDENCE);
    }
  }

  private async createVerifier() {
    const issuer = this.config.get<string>('SUPABASE_JWT_ISSUER')?.trim();
    const audience =
      this.config.get<string>('SUPABASE_JWT_AUDIENCE')?.trim() ||
      'authenticated';
    const jwksUrl = this.config.get<string>('SUPABASE_JWKS_URL')?.trim();
    if (!issuer || !jwksUrl) throw new Error('Auth configuration unavailable');
    const parsedUrl = new URL(jwksUrl);
    if (parsedUrl.protocol !== 'https:') throw new Error('Invalid JWKS URL');
    const { createRemoteJWKSet } = await import('jose');
    return new SupabaseJwtVerifier({
      issuer,
      audience,
      algorithms: ['ES256', 'RS256'],
      key: createRemoteJWKSet(parsedUrl),
    });
  }
}

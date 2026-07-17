import { Injectable } from '@nestjs/common';
import { DatabaseApplicationPrincipalResolver } from './application-principal.resolver';
import { ConfiguredSupabaseJwtVerifier } from './supabase-jwt.verifier';

@Injectable()
export class AuthBootstrapService {
  constructor(
    private readonly verifier: ConfiguredSupabaseJwtVerifier,
    private readonly resolver: DatabaseApplicationPrincipalResolver,
  ) {}

  async bootstrap(token: string) {
    const identity = await this.verifier.verify(token);
    return this.resolver.provision(identity);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import type { OwnedProfileRepository, ProfileInput } from '../identity';
import { OWNED_PROFILE_REPOSITORY } from './auth.tokens';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(OWNED_PROFILE_REPOSITORY)
    private readonly profiles: OwnedProfileRepository,
  ) {}

  get(principal: ApplicationPrincipal) {
    return this.profiles.findOwned(
      principal.applicationUserId,
      principal.applicationUserId,
    );
  }

  update(principal: ApplicationPrincipal, input: ProfileInput) {
    return this.profiles.upsertOwned(
      principal.applicationUserId,
      principal.applicationUserId,
      input,
    );
  }
}

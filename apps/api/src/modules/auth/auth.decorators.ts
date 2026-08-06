import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLE = 'auth.requiredRole';
export const REQUIRED_OWNER = 'auth.requiredOwner';
export const RequireRole = (role: string) => SetMetadata(REQUIRED_ROLE, role);
export const RequireAnyRole = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLE, roles);
export const RequireOwner = (resourceType: string) =>
  SetMetadata(REQUIRED_OWNER, resourceType);

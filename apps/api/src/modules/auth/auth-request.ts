import type { Request } from 'express';
import type { ApplicationPrincipal } from '../access';

export type AuthenticatedRequest = Request & {
  principal?: ApplicationPrincipal;
  correlationId?: string;
};

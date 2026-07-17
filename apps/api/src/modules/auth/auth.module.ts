import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PrismaApplicationIdentityRepository,
  PrismaApplicationRoleRepository,
  PrismaOwnedProfileRepository,
} from '../identity';
import { DatabaseApplicationPrincipalResolver } from './application-principal.resolver';
import {
  AuthenticationGuard,
  OwnerGuard,
  RequiredRoleGuard,
} from './auth.guards';
import {
  APPLICATION_IDENTITY_REPOSITORY,
  APPLICATION_PRINCIPAL_RESOLVER,
  APPLICATION_ROLE_REPOSITORY,
  EXTERNAL_IDENTITY_VERIFIER,
  OWNED_PROFILE_REPOSITORY,
} from './auth.tokens';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ConfiguredSupabaseJwtVerifier } from './supabase-jwt.verifier';
import { AuthBootstrapController } from './auth-bootstrap.controller';
import { AuthBootstrapService } from './auth-bootstrap.service';

@Module({
  controllers: [ProfileController, AuthBootstrapController],
  providers: [
    ProfileService,
    AuthenticationGuard,
    RequiredRoleGuard,
    OwnerGuard,
    ConfiguredSupabaseJwtVerifier,
    DatabaseApplicationPrincipalResolver,
    AuthBootstrapService,
    {
      provide: APPLICATION_IDENTITY_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaApplicationIdentityRepository(prisma),
    },
    {
      provide: APPLICATION_ROLE_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaApplicationRoleRepository(prisma),
    },
    {
      provide: OWNED_PROFILE_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaOwnedProfileRepository(prisma),
    },
    {
      provide: EXTERNAL_IDENTITY_VERIFIER,
      useExisting: ConfiguredSupabaseJwtVerifier,
    },
    {
      provide: APPLICATION_PRINCIPAL_RESOLVER,
      useExisting: DatabaseApplicationPrincipalResolver,
    },
  ],
  exports: [
    EXTERNAL_IDENTITY_VERIFIER,
    APPLICATION_PRINCIPAL_RESOLVER,
    APPLICATION_IDENTITY_REPOSITORY,
    APPLICATION_ROLE_REPOSITORY,
    OWNED_PROFILE_REPOSITORY,
    AuthenticationGuard,
    RequiredRoleGuard,
    OwnerGuard,
  ],
})
export class AuthModule {}

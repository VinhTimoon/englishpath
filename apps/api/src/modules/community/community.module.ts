import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CommunityController } from './community.controller';
import { CommunityRepository } from './community.repository';
import { CommunityService } from './community.service';
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CommunityController],
  providers: [CommunityRepository, CommunityService],
})
export class CommunityModule {}

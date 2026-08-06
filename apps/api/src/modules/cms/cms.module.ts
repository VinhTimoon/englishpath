import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CmsController } from './cms.controller';
import { CmsRepository } from './cms.repository';
import { CmsService } from './cms.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CmsController],
  providers: [CmsRepository, CmsService],
})
export class CmsModule {}

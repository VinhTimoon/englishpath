import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AdminController } from './admin.controller';
import { AdminAuthenticationGuard } from './admin-authentication.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdminController],
  providers: [
    AdminRepository,
    AdminService,
    AdminAuthenticationGuard,
    AdminRoleGuard,
  ],
})
export class AdminModule {}

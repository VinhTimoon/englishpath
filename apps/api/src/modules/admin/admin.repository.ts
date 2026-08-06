import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async operationalSummary() {
    const [activeUsers, activeRoleAssignments] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userRole.count({
        where: { user: { status: 'ACTIVE' } },
      }),
    ]);
    return { activeUsers, activeRoleAssignments };
  }
}

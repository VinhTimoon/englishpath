import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthRepository } from './health.repository';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('HealthRepository', () => {
  let repository: HealthRepository;
  let prismaService: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<HealthRepository>(HealthRepository);
  });

  it('checks database connectivity through PrismaService', async () => {
    prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(repository.isDatabaseConnected()).resolves.toBe(true);
    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

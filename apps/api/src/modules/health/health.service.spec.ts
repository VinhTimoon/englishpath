import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthRepository } from './health.repository';
import { HealthService } from './health.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('HealthService', () => {
  let service: HealthService;
  let healthRepository: { isDatabaseConnected: jest.Mock };

  beforeEach(async () => {
    healthRepository = {
      isDatabaseConnected: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthRepository,
          useValue: healthRepository,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('returns the expected healthy response shape', async () => {
    healthRepository.isDatabaseConnected.mockResolvedValue(true);

    const result = await service.getHealthStatus();

    expect(result.status).toBe('ok');
    expect(result.api).toBe('running');
    expect(result.database).toBe('connected');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('throws a sanitized service unavailable response when the database probe fails', async () => {
    healthRepository.isDatabaseConnected.mockRejectedValue(
      new Error('db down'),
    );

    try {
      await service.getHealthStatus();
      fail('Expected service to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const exception = error as ServiceUnavailableException;
      const response = exception.getResponse();

      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();

      const responseBody = response as Record<string, unknown>;
      expect(responseBody.status).toBe('error');
      expect(responseBody.api).toBe('running');
      expect(responseBody.database).toBe('disconnected');
      expect(typeof responseBody.timestamp).toBe('string');
    }
  });
});

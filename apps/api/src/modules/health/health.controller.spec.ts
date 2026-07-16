import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

jest.mock('./health.service', () => ({
  HealthService: class HealthService {},
}));

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: { getHealthStatus: jest.Mock };

  beforeEach(async () => {
    healthService = {
      getHealthStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('delegates health checks to the service', async () => {
    const response = {
      status: 'ok',
      api: 'running',
      database: 'connected',
      timestamp: '2026-07-16T00:00:00.000Z',
    };
    healthService.getHealthStatus.mockResolvedValue(response);

    await expect(controller.getHealthStatus()).resolves.toEqual(response);
    expect(healthService.getHealthStatus).toHaveBeenCalledTimes(1);
  });
});

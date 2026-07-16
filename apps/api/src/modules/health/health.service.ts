import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async getHealthStatus(): Promise<HealthResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      await this.healthRepository.isDatabaseConnected();

      return {
        status: 'ok',
        api: 'running',
        database: 'connected',
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        api: 'running',
        database: 'disconnected',
        timestamp,
      });
    }
  }
}

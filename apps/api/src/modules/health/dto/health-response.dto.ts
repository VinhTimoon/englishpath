import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'running' })
  api!: string;

  @ApiProperty({ example: 'connected' })
  database!: string;

  @ApiProperty({ example: '2026-07-16T00:00:00.000Z' })
  timestamp!: string;
}

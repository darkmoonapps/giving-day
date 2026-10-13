import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthDto {
  @ApiProperty({ type: Boolean, example: true })
  connected!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({
    type: String,
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status!: 'healthy' | 'unhealthy';

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-01-15T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({ type: DatabaseHealthDto })
  database!: DatabaseHealthDto;
}

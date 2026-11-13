import { ApiProperty } from '@nestjs/swagger';

export class PastDistributionDayStatsDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '55555555-5555-4555-8555-555555555555',
  })
  dayId!: string;

  @ApiProperty({ type: String, example: '2026-10-15' })
  date!: string;

  @ApiProperty({
    type: String,
    enum: ['draft', 'published', 'in_progress', 'closed', 'cancelled'],
    example: 'closed',
  })
  status!: 'draft' | 'published' | 'in_progress' | 'closed' | 'cancelled';

  @ApiProperty({ type: Number, example: 2 })
  eldersServed!: number;

  @ApiProperty({ type: Number, example: 2 })
  packagesDelivered!: number;

  @ApiProperty({ type: Number, example: 1 })
  packagesNotDelivered!: number;

  @ApiProperty({ type: Number, example: 0 })
  packagesOpen!: number;

  @ApiProperty({ type: Number, example: 3 })
  volunteersConfirmed!: number;

  @ApiProperty({ type: Number, example: 1 })
  volunteersDeclined!: number;
}

export class PastDistributionDayStatsTotalsDto {
  @ApiProperty({ type: Number, example: 2 })
  days!: number;

  @ApiProperty({ type: Number, example: 3 })
  eldersServed!: number;

  @ApiProperty({ type: Number, example: 3 })
  packagesDelivered!: number;

  @ApiProperty({ type: Number, example: 1 })
  packagesNotDelivered!: number;

  @ApiProperty({ type: Number, example: 1 })
  packagesOpen!: number;

  @ApiProperty({ type: Number, example: 5 })
  volunteersConfirmed!: number;

  @ApiProperty({ type: Number, example: 1 })
  volunteersDeclined!: number;
}

export class CityPastDistributionDaysStatsDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: [PastDistributionDayStatsDto] })
  days!: PastDistributionDayStatsDto[];

  @ApiProperty({ type: PastDistributionDayStatsTotalsDto })
  totals!: PastDistributionDayStatsTotalsDto;
}

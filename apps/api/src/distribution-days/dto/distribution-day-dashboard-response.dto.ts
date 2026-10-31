import { ApiProperty } from '@nestjs/swagger';

export class DashboardVolunteerCountsDto {
  @ApiProperty({ type: Number, example: 3 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  confirmed!: number;

  @ApiProperty({ type: Number, example: 1 })
  pending!: number;

  @ApiProperty({ type: Number, example: 1 })
  declined!: number;
}

export class DashboardDeliveryCountsDto {
  @ApiProperty({ type: Number, example: 1 })
  unassigned!: number;

  @ApiProperty({ type: Number, example: 1 })
  assigned!: number;

  @ApiProperty({ type: Number, example: 0 })
  picked!: number;

  @ApiProperty({ type: Number, example: 0 })
  delivered!: number;

  @ApiProperty({ type: Number, example: 0 })
  notDelivered!: number;

  @ApiProperty({ type: Number, example: 0 })
  cancelled!: number;
}

export class DashboardUnassignedElderDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '13131313-1313-4131-8131-131313131313',
  })
  elderId!: string;

  @ApiProperty({ type: String, example: 'Yosef Abraham' })
  fullName!: string;
}

export class DistributionDayDashboardDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
  })
  dayId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: '2026-11-15' })
  date!: string;

  @ApiProperty({ type: String, example: '09:00:00' })
  startTime!: string;

  @ApiProperty({ type: String, example: '14:00:00' })
  endTime!: string;

  @ApiProperty({
    type: String,
    enum: ['draft', 'published', 'in_progress', 'closed', 'cancelled'],
    example: 'published',
  })
  status!: 'draft' | 'published' | 'in_progress' | 'closed' | 'cancelled';

  @ApiProperty({ type: DashboardVolunteerCountsDto })
  volunteers!: DashboardVolunteerCountsDto;

  @ApiProperty({ type: DashboardDeliveryCountsDto })
  deliveries!: DashboardDeliveryCountsDto;

  @ApiProperty({ type: [DashboardUnassignedElderDto] })
  unassignedElders!: DashboardUnassignedElderDto[];
}

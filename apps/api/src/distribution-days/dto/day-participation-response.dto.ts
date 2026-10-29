import { ApiProperty } from '@nestjs/swagger';

export class OwnDayParticipationDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
  })
  dayId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  volunteerId!: string;

  @ApiProperty({
    type: String,
    enum: ['confirmed', 'declined'],
    example: 'confirmed',
  })
  status!: 'confirmed' | 'declined';

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-29T10:00:00.000Z',
  })
  respondedAt!: string | null;

  @ApiProperty({
    type: String,
    example: 'Family event in Holon',
    nullable: true,
  })
  cancelReason!: string | null;
}

export class DayParticipationCoordinatorRowDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  volunteerId!: string;

  @ApiProperty({ type: String, example: 'Yonatan', nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, example: 'Bar', nullable: true })
  lastName!: string | null;

  @ApiProperty({
    type: String,
    enum: ['confirmed', 'declined', 'no_response'],
    example: 'confirmed',
  })
  responseStatus!: 'confirmed' | 'declined' | 'no_response';

  @ApiProperty({
    type: String,
    example: 'Family event in Holon',
    nullable: true,
  })
  cancelReason!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-29T10:00:00.000Z',
  })
  respondedAt!: string | null;
}

export class DayParticipationsResponseDto {
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

  @ApiProperty({ type: [DayParticipationCoordinatorRowDto] })
  responses!: DayParticipationCoordinatorRowDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryElderContactDto {
  @ApiProperty({ type: String, example: 'Tamar Levi' })
  name!: string;

  @ApiProperty({
    type: String,
    enum: [
      'child',
      'spouse',
      'sibling',
      'caregiver',
      'social_worker',
      'neighbor',
      'other',
    ],
    example: 'child',
  })
  relation!:
    | 'child'
    | 'spouse'
    | 'sibling'
    | 'caregiver'
    | 'social_worker'
    | 'neighbor'
    | 'other';

  @ApiProperty({ type: String, example: '+972506666666' })
  phone!: string;

  @ApiProperty({ type: Boolean, example: true })
  isPrimary!: boolean;
}

export class DeliveryElderDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Rivkah Levi' })
  fullName!: string;

  @ApiProperty({ type: String, example: '12 Example St' })
  street!: string;

  @ApiProperty({ type: String, example: '12' })
  houseNumber!: string;

  @ApiProperty({ type: String, example: 'B', nullable: true })
  entrance!: string | null;

  @ApiProperty({ type: String, example: '3', nullable: true })
  floor!: string | null;

  @ApiProperty({ type: String, example: '7', nullable: true })
  apartment!: string | null;

  @ApiProperty({
    type: String,
    example: 'Knock loudly',
    nullable: true,
  })
  addressNotes!: string | null;

  @ApiProperty({
    type: String,
    example: 'Entrance is around the back',
    nullable: true,
  })
  notes!: string | null;

  @ApiProperty({ type: [DeliveryElderContactDto] })
  contacts!: DeliveryElderContactDto[];
}

export class DeliveryVolunteerDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Yonatan', nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, example: 'Bar', nullable: true })
  lastName!: string | null;
}

export class ReplacementSuggestionDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '99999999-9999-4999-8999-999999999999',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Dana', nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, example: 'Levi', nullable: true })
  lastName!: string | null;

  @ApiProperty({
    type: String,
    example: 'Weizmann',
    nullable: true,
    description:
      'Volunteer neighborhood only. Used to rank suggestions next to the elder address',
  })
  homeArea!: string | null;
}

export class DeliveryResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '16161616-1616-4161-8161-161616161616',
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
    enum: [
      'unassigned',
      'assigned',
      'picked',
      'delivered',
      'not_delivered',
      'cancelled',
    ],
    example: 'assigned',
  })
  status!:
    | 'unassigned'
    | 'assigned'
    | 'picked'
    | 'delivered'
    | 'not_delivered'
    | 'cancelled';

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Required and returned when status is not_delivered',
  })
  note!: string | null;

  @ApiProperty({
    type: String,
    enum: [
      'not_home',
      'refused',
      'wrong_address',
      'hospitalized',
      'deceased',
      'other',
    ],
    nullable: true,
    example: null,
    description: 'Required and returned when status is not_delivered',
  })
  notDeliveredReason!:
    | 'not_home'
    | 'refused'
    | 'wrong_address'
    | 'hospitalized'
    | 'deceased'
    | 'other'
    | null;

  @ApiProperty({ type: DeliveryElderDto })
  elder!: DeliveryElderDto;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  volunteerId?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    example: '14141414-1414-4141-8141-141414141414',
  })
  matchId?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-28T09:00:00.000Z',
  })
  assignedAt?: string | null;

  @ApiPropertyOptional({ type: DeliveryVolunteerDto, nullable: true })
  volunteer?: DeliveryVolunteerDto | null;

  @ApiPropertyOptional({
    type: [ReplacementSuggestionDto],
    description:
      'Confirmed volunteers ranked by home-area proximity to this elder. Coordinators only; empty when the delivery is assigned',
  })
  replacementSuggestions?: ReplacementSuggestionDto[];
}

export class DayDeliveriesResponseDto {
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

  @ApiProperty({ type: String, example: 'חולון' })
  cityNameHe!: string;

  @ApiProperty({ type: String, example: 'Holon' })
  cityNameEn!: string;

  @ApiProperty({
    type: String,
    example: '10 Warehouse Rd, Holon',
    description:
      'Distribution center address from city settings; empty when not configured',
  })
  centerAddress!: string;

  @ApiProperty({ type: [DeliveryResponseDto] })
  deliveries!: DeliveryResponseDto[];

  @ApiPropertyOptional({
    type: [DeliveryVolunteerDto],
    description:
      'Volunteers who confirmed participation for this distribution day',
  })
  assignableVolunteers?: DeliveryVolunteerDto[];

  @ApiPropertyOptional({ type: Number, example: 1 })
  unassignedCount?: number;
}

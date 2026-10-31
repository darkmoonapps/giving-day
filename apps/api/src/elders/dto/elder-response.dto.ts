import { ApiProperty } from '@nestjs/swagger';

export class ElderContactResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '14141414-1414-4141-8141-141414141414',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Contact 1' })
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

  @ApiProperty({ type: String, example: '+972500000001' })
  phone!: string;

  @ApiProperty({ type: Boolean, example: true })
  isPrimary!: boolean;
}

export class ElderResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: 'Elder A' })
  fullName!: string;

  @ApiProperty({ type: String, example: '+972500000010', nullable: true })
  phone!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  phoneAlt!: string | null;

  @ApiProperty({ type: String, example: 'he' })
  language!: string;

  @ApiProperty({ type: String, example: '1 Test Street' })
  street!: string;

  @ApiProperty({ type: String, example: '1' })
  houseNumber!: string;

  @ApiProperty({ type: String, example: null, nullable: true })
  entrance!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  floor!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  apartment!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  buildingCode!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  addressNotes!: string | null;

  @ApiProperty({ type: Number, example: null, nullable: true })
  lat!: number | null;

  @ApiProperty({ type: Number, example: null, nullable: true })
  lng!: number | null;

  @ApiProperty({
    type: String,
    enum: ['pending', 'ok', 'failed', 'manual'],
    example: 'pending',
  })
  geocodeStatus!: 'pending' | 'ok' | 'failed' | 'manual';

  @ApiProperty({
    type: String,
    enum: ['active', 'paused', 'hospitalized', 'moved', 'deceased', 'removed'],
    example: 'active',
  })
  status!:
    'active' | 'paused' | 'hospitalized' | 'moved' | 'deceased' | 'removed';

  @ApiProperty({ type: String, example: null, nullable: true })
  statusReason!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  archivedAt!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-01T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-01T09:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({ type: [ElderContactResponseDto] })
  contacts!: ElderContactResponseDto[];
}

export class EldersResponseDto {
  @ApiProperty({ type: [ElderResponseDto] })
  elders!: ElderResponseDto[];
}

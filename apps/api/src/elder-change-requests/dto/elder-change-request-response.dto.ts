import { ApiProperty } from '@nestjs/swagger';
import { changeRequestStatusSchema } from '@giving-day/shared';
import { ElderContactResponseDto } from '../../elders/dto/elder-response.dto';

const CHANGE_REQUEST_STATUSES = changeRequestStatusSchema.options;

export class ElderChangeFieldDiffDto {
  @ApiProperty({ type: String, example: '1 Test Street', nullable: true })
  from!: string | null;

  @ApiProperty({ type: String, example: '4 Park Ave', nullable: true })
  to!: string | null;
}

export class ElderChangeRequestContactSnapshotDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    required: false,
    example: '14141414-1414-4141-8141-141414141414',
  })
  id?: string;

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

export class ElderChangeContactsDiffDto {
  @ApiProperty({ type: [ElderChangeRequestContactSnapshotDto] })
  from!: ElderChangeRequestContactSnapshotDto[];

  @ApiProperty({ type: [ElderChangeRequestContactSnapshotDto] })
  to!: ElderChangeRequestContactSnapshotDto[];
}

export class ElderChangeRequestChangesDto {
  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  street?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  houseNumber?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  entrance?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  floor?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  apartment?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  addressNotes?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeFieldDiffDto, required: false })
  notes?: ElderChangeFieldDiffDto;

  @ApiProperty({ type: ElderChangeContactsDiffDto, required: false })
  contacts?: ElderChangeContactsDiffDto;
}

export class ElderChangeRequestElderSnapshotDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Elder A' })
  fullName!: string;

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
  addressNotes!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [ElderContactResponseDto] })
  contacts!: ElderContactResponseDto[];
}

export class ElderChangeRequestVolunteerDto {
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

export class ElderChangeRequestResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '17171717-1717-4171-8171-171717171717',
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
    example: '12121212-1212-4121-8121-121212121212',
  })
  elderId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  requestedById!: string;

  @ApiProperty({ type: ElderChangeRequestChangesDto })
  changes!: ElderChangeRequestChangesDto;

  @ApiProperty({ type: String, example: 'Moved within Holon', nullable: true })
  reason!: string | null;

  @ApiProperty({
    type: String,
    enum: CHANGE_REQUEST_STATUSES,
    example: 'pending',
  })
  status!: (typeof CHANGE_REQUEST_STATUSES)[number];

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: null,
    nullable: true,
  })
  reviewedById!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: null,
    nullable: true,
  })
  reviewedAt!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  reviewNote!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-31T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-31T09:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({ type: ElderChangeRequestElderSnapshotDto })
  elder!: ElderChangeRequestElderSnapshotDto;

  @ApiProperty({ type: ElderChangeRequestVolunteerDto })
  requestedBy!: ElderChangeRequestVolunteerDto;
}

export class ElderChangeRequestsResponseDto {
  @ApiProperty({ type: [ElderChangeRequestResponseDto] })
  changeRequests!: ElderChangeRequestResponseDto[];
}

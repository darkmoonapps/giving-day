import { ApiProperty } from '@nestjs/swagger';
import { elderStatusSchema, matchEndReasonSchema } from '@giving-day/shared';

const ELDER_STATUSES = elderStatusSchema.options;
const END_REASONS = matchEndReasonSchema.options;

export class MatchElderSummaryDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'Rivkah Levi' })
  fullName!: string;

  @ApiProperty({
    type: String,
    enum: ELDER_STATUSES,
    example: 'active',
  })
  status!: (typeof ELDER_STATUSES)[number];
}

export class MatchVolunteerSummaryDto {
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

export class PermanentMatchResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '15151515-1515-4151-8151-151515151515',
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
  volunteerId!: string;

  @ApiProperty({ type: String, enum: ['permanent'], example: 'permanent' })
  type!: 'permanent';

  @ApiProperty({ type: String, example: '2026-10-01' })
  startsAt!: string;

  @ApiProperty({ type: String, example: null, nullable: true })
  endsAt!: string | null;

  @ApiProperty({
    type: String,
    enum: END_REASONS,
    example: null,
    nullable: true,
  })
  endReason!: (typeof END_REASONS)[number] | null;

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

  @ApiProperty({ type: MatchElderSummaryDto })
  elder!: MatchElderSummaryDto;

  @ApiProperty({ type: MatchVolunteerSummaryDto })
  volunteer!: MatchVolunteerSummaryDto;
}

export class PermanentMatchesResponseDto {
  @ApiProperty({ type: [PermanentMatchResponseDto] })
  matches!: PermanentMatchResponseDto[];

  @ApiProperty({ type: [MatchElderSummaryDto] })
  unmatchedElders!: MatchElderSummaryDto[];

  @ApiProperty({ type: [MatchVolunteerSummaryDto] })
  matchableVolunteers!: MatchVolunteerSummaryDto[];
}

export class OneTimeMatchResponseDto {
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
    example: '12121212-1212-4121-8121-121212121212',
  })
  elderId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  volunteerId!: string;

  @ApiProperty({ type: String, enum: ['one_time'], example: 'one_time' })
  type!: 'one_time';

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
  })
  dayId!: string;

  @ApiProperty({ type: String, example: '2026-11-12' })
  startsAt!: string;

  @ApiProperty({ type: String, example: null, nullable: true })
  endsAt!: string | null;

  @ApiProperty({
    type: String,
    enum: END_REASONS,
    example: null,
    nullable: true,
  })
  endReason!: (typeof END_REASONS)[number] | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-01T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-01T09:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({ type: MatchElderSummaryDto })
  elder!: MatchElderSummaryDto;

  @ApiProperty({ type: MatchVolunteerSummaryDto })
  volunteer!: MatchVolunteerSummaryDto;
}

export class OneTimeMatchesResponseDto {
  @ApiProperty({ type: [OneTimeMatchResponseDto] })
  matches!: OneTimeMatchResponseDto[];

  @ApiProperty({ type: [MatchElderSummaryDto] })
  availableElders!: MatchElderSummaryDto[];

  @ApiProperty({ type: [MatchVolunteerSummaryDto] })
  matchableVolunteers!: MatchVolunteerSummaryDto[];
}

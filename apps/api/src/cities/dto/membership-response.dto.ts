import { ApiProperty } from '@nestjs/swagger';

export class CityMembershipRecordDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '99999999-9999-4999-8999-999999999999',
  })
  membershipId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  userId!: string;

  @ApiProperty({ type: String, example: 'Tamar', nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, example: 'Shalev', nullable: true })
  lastName!: string | null;

  @ApiProperty({
    type: String,
    example: 'tamar.shalev@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({ type: String, example: '+972506666666', nullable: true })
  phone!: string | null;

  @ApiProperty({
    type: String,
    example: 'volunteer',
    enum: ['coordinator', 'volunteer'],
  })
  role!: 'coordinator' | 'volunteer';

  @ApiProperty({
    type: String,
    example: 'pending',
    enum: ['pending', 'active', 'paused', 'removed'],
  })
  status!: 'pending' | 'active' | 'paused' | 'removed';

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-28T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-28T09:05:00.000Z',
    nullable: true,
  })
  approvedAt!: string | null;
}

export class CityPendingMembershipsResponseDto {
  @ApiProperty({ type: () => [CityMembershipRecordDto] })
  memberships!: CityMembershipRecordDto[];
}

import { ApiProperty } from '@nestjs/swagger';

export class CityCoordinatorDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  membershipId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  userId!: string;

  @ApiProperty({ type: String, example: 'Noa', nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, example: 'Levi', nullable: true })
  lastName!: string | null;

  @ApiProperty({
    type: String,
    example: 'noa.levi@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({ type: String, example: '+972502222222', nullable: true })
  phone!: string | null;

  @ApiProperty({
    type: String,
    example: 'active',
    enum: ['pending', 'active', 'paused', 'removed'],
  })
  status!: 'pending' | 'active' | 'paused' | 'removed';

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-01T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-01T09:05:00.000Z',
    nullable: true,
  })
  approvedAt!: string | null;
}

export class CityCoordinatorsResponseDto {
  @ApiProperty({ type: () => [CityCoordinatorDto] })
  coordinators!: CityCoordinatorDto[];
}

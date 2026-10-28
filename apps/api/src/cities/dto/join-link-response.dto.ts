import { ApiProperty } from '@nestjs/swagger';

export class CityJoinLinkDto {
  @ApiProperty({
    type: String,
    example: 'volunteer',
    enum: ['coordinator', 'volunteer'],
  })
  role!: 'coordinator' | 'volunteer';

  @ApiProperty({ type: String, example: 'fake-join-token' })
  token!: string;

  @ApiProperty({
    type: String,
    example: 'http://localhost:3000/join/fake-join-token',
  })
  url!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-28T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({ type: Number, example: 0 })
  usedCount!: number;
}

export class CityJoinLinksResponseDto {
  @ApiProperty({ type: () => [CityJoinLinkDto] })
  links!: CityJoinLinkDto[];
}

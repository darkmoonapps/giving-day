import { ApiProperty } from '@nestjs/swagger';
import { CityMembershipRecordDto } from './membership-response.dto';

export class CityVolunteerListItemDto extends CityMembershipRecordDto {
  @ApiProperty({ type: String, example: 'North', nullable: true })
  homeArea!: string | null;

  @ApiProperty({
    type: String,
    example: 'confirmed',
    enum: ['confirmed', 'declined', 'no_response'],
    nullable: true,
  })
  dayResponseStatus!: 'confirmed' | 'declined' | 'no_response' | null;

  @ApiProperty({
    type: String,
    example: 'Out of town',
    nullable: true,
  })
  cancelReason!: string | null;
}

export class CityVolunteersResponseDto {
  @ApiProperty({ type: () => [CityVolunteerListItemDto] })
  volunteers!: CityVolunteerListItemDto[];
}

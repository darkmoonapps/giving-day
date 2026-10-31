import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RedeemJoinLinkDto {
  @ApiProperty({
    type: String,
    example: 'fake-join-token',
    minLength: 1,
    maxLength: 128,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  token!: string;
}

export class RedeemedCityMembershipDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '99999999-9999-4999-8999-999999999999',
  })
  membershipId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: 'holon' })
  citySlug!: string;

  @ApiProperty({ type: String, example: 'חולון' })
  cityNameHe!: string;

  @ApiProperty({ type: String, example: 'Holon' })
  cityNameEn!: string;

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
}

export class RedeemJoinLinkResponseDto {
  @ApiProperty({
    type: String,
    example: 'pending',
    enum: ['pending', 'already_active'],
  })
  result!: 'pending' | 'already_active';

  @ApiProperty({ type: () => RedeemedCityMembershipDto })
  membership!: RedeemedCityMembershipDto;
}

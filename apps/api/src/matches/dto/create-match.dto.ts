import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePermanentMatchDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  @IsUUID()
  elderId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  })
  @IsUUID()
  volunteerId!: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-10-01',
    description: 'Calendar start date; defaults to today in the city timezone',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'validation.invalid_date' })
  startsAt?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { matchEndReasonSchema } from '@giving-day/shared';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const END_REASONS = matchEndReasonSchema.options;

export class EndPermanentMatchDto {
  @ApiProperty({
    type: String,
    enum: END_REASONS,
    example: 'reassigned',
  })
  @IsIn(END_REASONS)
  endReason!: (typeof END_REASONS)[number];

  @ApiPropertyOptional({
    type: String,
    example: '2026-10-31',
    description: 'Calendar end date; defaults to today in the city timezone',
  })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: 'validation.invalid_date' })
  endsAt?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { matchEndReasonSchema } from '@giving-day/shared';
import { IsIn, IsString } from 'class-validator';

const END_REASONS = matchEndReasonSchema.options;

export class EndOneTimeMatchDto {
  @ApiProperty({
    type: String,
    enum: END_REASONS,
    example: 'reassigned',
  })
  @IsString()
  @IsIn(END_REASONS)
  endReason!: (typeof END_REASONS)[number];
}

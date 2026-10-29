import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CANCEL_REASON_MAX_LENGTH } from '@giving-day/shared';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RespondToDistributionDayDto {
  @ApiProperty({
    type: String,
    enum: ['confirmed', 'declined'],
    example: 'confirmed',
  })
  @IsIn(['confirmed', 'declined'])
  status!: 'confirmed' | 'declined';

  @ApiPropertyOptional({
    type: String,
    example: 'Family event in Holon',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((dto: RespondToDistributionDayDto) => dto.status === 'declined')
  @IsString()
  @MinLength(1)
  @MaxLength(CANCEL_REASON_MAX_LENGTH)
  cancelReason?: string;
}

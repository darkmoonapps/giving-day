import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CANCEL_REASON_MAX_LENGTH } from '@giving-day/shared';

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
  @ValidateIf((dto: RespondToDistributionDayDto) => dto.status === 'declined')
  @IsString()
  @MinLength(1)
  @MaxLength(CANCEL_REASON_MAX_LENGTH)
  cancelReason?: string;
}

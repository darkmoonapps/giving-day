import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  DELIVERY_NOTE_MAX_LENGTH,
  notDeliveredReasonSchema,
  volunteerDeliveryStatusSchema,
} from '@giving-day/shared';

const VOLUNTEER_STATUSES = volunteerDeliveryStatusSchema.options;
const NOT_DELIVERED_REASONS = notDeliveredReasonSchema.options;

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    type: String,
    enum: VOLUNTEER_STATUSES,
    example: 'picked',
    description:
      'Assigned volunteer marks Picked, then Delivered or Not delivered',
  })
  @IsIn(VOLUNTEER_STATUSES)
  status!: (typeof VOLUNTEER_STATUSES)[number];

  @ApiPropertyOptional({
    type: String,
    example: 'Elder was not home in Holon',
    description: 'Required when status is not_delivered',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @ValidateIf((dto: UpdateDeliveryStatusDto) => dto.status === 'not_delivered')
  @IsString()
  @MinLength(1)
  @MaxLength(DELIVERY_NOTE_MAX_LENGTH)
  note?: string;

  @ApiPropertyOptional({
    type: String,
    enum: NOT_DELIVERED_REASONS,
    example: 'not_home',
    description: 'Required when status is not_delivered',
  })
  @ValidateIf((dto: UpdateDeliveryStatusDto) => dto.status === 'not_delivered')
  @IsIn(NOT_DELIVERED_REASONS)
  notDeliveredReason?: (typeof NOT_DELIVERED_REASONS)[number];
}

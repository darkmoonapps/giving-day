import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class UpdateDistributionDayDto {
  @ApiPropertyOptional({ type: String, example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  startTime?: string;

  @ApiPropertyOptional({ type: String, example: '13:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  endTime?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Pick up an additional blanket/package',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(4000)
  notesForVolunteers?: string | null;
}

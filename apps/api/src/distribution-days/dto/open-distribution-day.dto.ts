import { NOTES_FOR_VOLUNTEERS_MAX_LENGTH } from '@giving-day/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class OpenDistributionDayDto {
  @ApiProperty({ type: String, example: '2026-11-15' })
  @IsString()
  @Matches(DATE_ONLY, { message: 'validation.invalid_date' })
  date!: string;

  @ApiPropertyOptional({ type: String, example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  startTime?: string;

  @ApiPropertyOptional({ type: String, example: '14:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  endTime?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Bring a folding cart',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NOTES_FOR_VOLUNTEERS_MAX_LENGTH)
  notesForVolunteers?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Need extra rice bags',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(NOTES_FOR_VOLUNTEERS_MAX_LENGTH)
  internalNotes?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['holiday honey'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  addOns?: string[];
}

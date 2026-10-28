import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class UpdateCitySettingsDto {
  @ApiPropertyOptional({ example: '10 Warehouse Rd, Holon' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  centerAddress?: string;

  @ApiPropertyOptional({ example: 32.0114 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  centerLat?: number;

  @ApiPropertyOptional({ example: 34.7748 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  centerLng?: number;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  defaultStartTime?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_OF_DAY, { message: 'validation.invalid_time' })
  defaultEndTime?: string;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  confirmReminderAfterHours?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  unpickedPushMinutesBeforeEnd?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  missingFinalStatusWaitHours?: number;

  @ApiPropertyOptional({ example: 'he', enum: ['he', 'en'] })
  @IsOptional()
  @IsIn(['he', 'en'])
  defaultLocale?: 'he' | 'en';

  @ApiPropertyOptional({ example: 'wisteria-mint' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  defaultTheme?: string;

  @ApiPropertyOptional({ example: 'Latet Holon', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  orgName?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.svg',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\//i, { message: 'validation.https_url_required' })
  @MaxLength(2048)
  logoUrl?: string | null;

  @ApiPropertyOptional({ example: { mapZoom: 14 } })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

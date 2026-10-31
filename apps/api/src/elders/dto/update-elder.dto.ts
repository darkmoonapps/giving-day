import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ElderContactInputDto } from './elder-contact-input.dto';

const ELDER_STATUSES = [
  'active',
  'paused',
  'hospitalized',
  'moved',
  'deceased',
  'removed',
] as const;

const GEOCODE_STATUSES = ['pending', 'ok', 'failed', 'manual'] as const;

export class UpdateElderDto {
  @ApiPropertyOptional({ type: String, example: 'Elder A' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({
    type: String,
    example: '+972500000010',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({ type: String, example: null, nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(20)
  phoneAlt?: string | null;

  @ApiPropertyOptional({ type: String, example: 'he' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ type: String, example: '1 Test Street' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ type: String, example: '1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumber?: string;

  @ApiPropertyOptional({ type: String, example: 'B', nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(50)
  entrance?: string | null;

  @ApiPropertyOptional({ type: String, example: '3', nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(20)
  floor?: string | null;

  @ApiPropertyOptional({ type: String, example: '7', nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(20)
  apartment?: string | null;

  @ApiPropertyOptional({ type: String, example: '1234', nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(50)
  buildingCode?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Knock loudly',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  addressNotes?: string | null;

  @ApiPropertyOptional({ type: Number, example: 32.0114, nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number | null;

  @ApiPropertyOptional({ type: Number, example: 34.7748, nullable: true })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number | null;

  @ApiPropertyOptional({
    type: String,
    enum: GEOCODE_STATUSES,
    example: 'manual',
  })
  @IsOptional()
  @IsIn(GEOCODE_STATUSES)
  geocodeStatus?: (typeof GEOCODE_STATUSES)[number];

  @ApiPropertyOptional({
    type: String,
    enum: ELDER_STATUSES,
    example: 'paused',
  })
  @IsOptional()
  @IsIn(ELDER_STATUSES)
  status?: (typeof ELDER_STATUSES)[number];

  @ApiPropertyOptional({
    type: String,
    example: 'Hospital stay',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  statusReason?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Entrance is around the back',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: () => [ElderContactInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElderContactInputDto)
  contacts?: ElderContactInputDto[];
}

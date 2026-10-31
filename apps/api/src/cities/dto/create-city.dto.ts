import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CITY_NAME_MAX_LENGTH,
  CITY_SLUG_MAX_LENGTH,
  DEFAULT_CITY_TIMEZONE,
} from '@giving-day/shared';

export class CreateCityDto {
  @ApiProperty({
    type: String,
    example: 'example-city',
    description: 'URL-safe unique city key',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(CITY_SLUG_MAX_LENGTH)
  @Matches(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/, {
    message: 'validation.invalid_slug',
  })
  slug!: string;

  @ApiProperty({ type: String, example: 'עיר דוגמה' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CITY_NAME_MAX_LENGTH)
  nameHe!: string;

  @ApiProperty({ type: String, example: 'Example City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CITY_NAME_MAX_LENGTH)
  nameEn!: string;

  @ApiPropertyOptional({
    type: String,
    example: DEFAULT_CITY_TIMEZONE,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

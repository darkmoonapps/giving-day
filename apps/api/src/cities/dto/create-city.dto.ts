import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
  type ValidationOptions,
} from 'class-validator';
import {
  CITY_NAME_MAX_LENGTH,
  CITY_SLUG_MAX_LENGTH,
  CITY_TIMEZONE_MAX_LENGTH,
  DEFAULT_CITY_TIMEZONE,
  isIanaTimeZone,
} from '@giving-day/shared';

function IsIanaTimeZone(
  validationOptions?: ValidationOptions
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIanaTimeZone',
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isIanaTimeZone(value);
        },
      },
    },
    validationOptions
  );
}

export class CreateCityDto {
  @ApiProperty({
    type: String,
    example: 'example-city',
    description: 'URL-safe unique city key',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(CITY_SLUG_MAX_LENGTH, { message: 'validation.slug_too_long' })
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
  @MaxLength(CITY_TIMEZONE_MAX_LENGTH)
  @IsIanaTimeZone({ message: 'validation.invalid_timezone' })
  timezone?: string;
}

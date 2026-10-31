import { ApiProperty } from '@nestjs/swagger';
import { DEFAULT_CITY_TIMEZONE } from '@giving-day/shared';

export class CityResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
  })
  id!: string;

  @ApiProperty({ type: String, example: 'example-city' })
  slug!: string;

  @ApiProperty({ type: String, example: 'עיר דוגמה' })
  nameHe!: string;

  @ApiProperty({ type: String, example: 'Example City' })
  nameEn!: string;

  @ApiProperty({ type: String, example: DEFAULT_CITY_TIMEZONE })
  timezone!: string;

  @ApiProperty({ type: Boolean, example: true })
  isActive!: boolean;
}

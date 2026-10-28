import { ApiProperty } from '@nestjs/swagger';

export class CitySettingsResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: '10 Warehouse Rd, Holon' })
  centerAddress!: string;

  @ApiProperty({ type: Number, example: 32.0114 })
  centerLat!: number;

  @ApiProperty({ type: Number, example: 34.7748 })
  centerLng!: number;

  @ApiProperty({ type: String, example: '09:00:00' })
  defaultStartTime!: string;

  @ApiProperty({ type: String, example: '14:00:00' })
  defaultEndTime!: string;

  @ApiProperty({ type: Number, example: 24 })
  confirmReminderAfterHours!: number;

  @ApiProperty({ type: Number, example: 60 })
  unpickedPushMinutesBeforeEnd!: number;

  @ApiProperty({ type: Number, example: 72 })
  missingFinalStatusWaitHours!: number;

  @ApiProperty({ type: String, example: 'he', enum: ['he', 'en'] })
  defaultLocale!: 'he' | 'en';

  @ApiProperty({ type: String, example: 'wisteria-mint' })
  defaultTheme!: string;

  @ApiProperty({ type: String, example: 'Latet Holon', nullable: true })
  orgName!: string | null;

  @ApiProperty({ type: String, example: null, nullable: true })
  logoUrl!: string | null;

  @ApiProperty({ type: Object, example: { mapZoom: 14 } })
  extra!: Record<string, unknown>;
}

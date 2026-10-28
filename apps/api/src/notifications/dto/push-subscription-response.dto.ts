import { ApiProperty } from '@nestjs/swagger';

export class PushSubscriptionResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
  })
  id!: string;

  @ApiProperty({
    type: String,
    example: 'https://push.example.com/fake-subscription',
  })
  endpoint!: string;

  @ApiProperty({ type: String, example: 'Mozilla/5.0 GivingDayTest' })
  userAgent!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-28T09:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  lastSuccessAt!: string | null;

  @ApiProperty({ type: Number, example: 0 })
  failedCount!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  disabledAt!: string | null;
}

export class PushSubscriptionsResponseDto {
  @ApiProperty({ type: () => [PushSubscriptionResponseDto] })
  subscriptions!: PushSubscriptionResponseDto[];
}

export class VapidPublicKeyDto {
  @ApiProperty({ type: String, nullable: true, example: null })
  publicKey!: string | null;

  @ApiProperty({ type: Boolean, example: false })
  configured!: boolean;
}

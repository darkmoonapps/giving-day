import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertPushSubscriptionDto {
  @ApiProperty({
    example: 'https://push.example.com/fake-subscription',
  })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @ApiProperty({ example: 'fake-p256dh-key' })
  @IsString()
  @MaxLength(512)
  p256dh!: string;

  @ApiProperty({ example: 'fake-auth-secret' })
  @IsString()
  @MaxLength(512)
  auth!: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0 GivingDayTest' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

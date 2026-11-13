import { ApiProperty } from '@nestjs/swagger';

export class AuditLogEntryDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    nullable: true,
  })
  cityId!: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
  })
  actorId!: string;

  @ApiProperty({ type: String, example: 'membership.approve' })
  action!: string;

  @ApiProperty({ type: String, example: 'membership' })
  entity!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '99999999-9999-4999-8999-999999999999',
  })
  entityId!: string;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    example: {
      userId: '12121212-1212-4121-8121-121212121212',
      role: 'volunteer',
    },
  })
  diff!: Record<string, string | number | boolean | null>;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-13T09:00:00.000Z',
  })
  at!: string;
}

export class CityAuditLogsResponseDto {
  @ApiProperty({ type: () => [AuditLogEntryDto] })
  entries!: AuditLogEntryDto[];

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  pageSize!: number;

  @ApiProperty({ type: Number, example: 1 })
  total!: number;
}

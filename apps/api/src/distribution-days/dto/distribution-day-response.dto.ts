import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OwnDayParticipationDto } from './day-participation-response.dto';

export class DistributionDayResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: '2026-11-15' })
  date!: string;

  @ApiProperty({ type: String, example: '09:00:00' })
  startTime!: string;

  @ApiProperty({ type: String, example: '14:00:00' })
  endTime!: string;

  @ApiProperty({
    type: String,
    example: 'Bring a folding cart',
    nullable: true,
  })
  notesForVolunteers!: string | null;

  @ApiProperty({ type: [String], example: ['holiday honey'] })
  addOns!: string[];

  @ApiProperty({
    type: String,
    enum: ['draft', 'published', 'in_progress', 'closed', 'cancelled'],
    example: 'published',
  })
  status!: 'draft' | 'published' | 'in_progress' | 'closed' | 'cancelled';

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-28T09:00:00.000Z',
  })
  publishedAt!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  closedAt!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Need extra rice bags',
    nullable: true,
  })
  internalNotes?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  createdById?: string;

  @ApiPropertyOptional({
    type: OwnDayParticipationDto,
    nullable: true,
  })
  myParticipation?: OwnDayParticipationDto | null;
}

export class DistributionDaysResponseDto {
  @ApiProperty({ type: [DistributionDayResponseDto] })
  days!: DistributionDayResponseDto[];
}

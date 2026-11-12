import { ApiProperty } from '@nestjs/swagger';
import { TEMPLATE_KEYS } from '@giving-day/shared';

export class MessageTemplateResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  id!: string | null;

  @ApiProperty({
    type: String,
    enum: TEMPLATE_KEYS,
    example: 'day_invite',
  })
  key!: (typeof TEMPLATE_KEYS)[number];

  @ApiProperty({ type: String, enum: ['he', 'en'], example: 'he' })
  locale!: 'he' | 'en';

  @ApiProperty({ type: String, example: 'יום חלוקה' })
  title!: string;

  @ApiProperty({
    type: String,
    example: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  })
  body!: string;

  @ApiProperty({ type: String, example: 'יום חלוקה' })
  defaultTitle!: string;

  @ApiProperty({
    type: String,
    example: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  })
  defaultBody!: string;

  @ApiProperty({ type: Boolean, example: false })
  isCustom!: boolean;

  @ApiProperty({
    type: [String],
    example: ['date', 'startTime', 'endTime'],
  })
  placeholders!: string[];
}

export class MessageTemplatesResponseDto {
  @ApiProperty({ type: [MessageTemplateResponseDto] })
  templates!: MessageTemplateResponseDto[];
}

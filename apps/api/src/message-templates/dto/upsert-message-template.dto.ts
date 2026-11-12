import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpsertMessageTemplateDto {
  @ApiProperty({ type: String, example: 'יום חלוקה בחולון' })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    type: String,
    example:
      'האם תוכל/י לחלק בחולון ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}
